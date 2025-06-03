import { Inject, Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { InvoiceStatus, PaymentMethod, PaymentStatus, PaymentType } from '../../constants/payment.enum';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FindAllPaymentsDto } from './dto/find-all-payments.dto';
import { Invoice } from '../invoices/entities/invoice.entity';
import { ConfigService } from '@nestjs/config';
import { BookingStatus } from '../../constants/booking.enum';
import { VoucherService } from '../vouchers/voucher.service';
import { VoucherUserStatusEnum } from '../../constants/voucher.enum';
import PayOS from '@payos/node';
import { BookingService } from '../bookings/booking.service';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @Inject('PAYOS_CLIENT') private readonly payos: PayOS,
    private readonly configService: ConfigService,
    private readonly bookingService: BookingService,
    private readonly voucherService: VoucherService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    // Validate required fields
    if (!createPaymentDto.invoiceId) {
      throw new BadRequestException('ID hóa đơn không được để trống');
    }
    if (!createPaymentDto.amount || createPaymentDto.amount <= 0) {
      throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0');
    }
    if (!createPaymentDto.paymentMethod) {
      throw new BadRequestException('Phương thức thanh toán không được để trống');
    }
    if (!createPaymentDto.type) {
      throw new BadRequestException('Loại thanh toán không được để trống');
    }

    // Check if invoice exists
    const invoice = await this.invoiceRepo.findOne({
      where: { id: createPaymentDto.invoiceId }
    });
    if (!invoice) {
      throw new NotFoundException(`Không tìm thấy hóa đơn với ID ${createPaymentDto.invoiceId}`);
    }

    // Check if payment amount is valid
    if (createPaymentDto.type === PaymentType.DEPOSIT && createPaymentDto.amount > invoice.depositAmount) {
      throw new BadRequestException('Số tiền đặt cọc không được vượt quá số tiền cần đặt cọc');
    }
    if (createPaymentDto.type === PaymentType.REMAINING && createPaymentDto.amount > invoice.remainingAmount) {
      throw new BadRequestException('Số tiền thanh toán không được vượt quá số tiền còn lại');
    }

    // Check if payment already exists for this invoice and type
    const existingPayment = await this.paymentRepository.findOne({
      where: {
        invoiceId: createPaymentDto.invoiceId,
        type: createPaymentDto.type,
        status: PaymentStatus.PAID
      }
    });
    if (existingPayment) {
      throw new ConflictException(`Đã tồn tại thanh toán ${createPaymentDto.type} cho hóa đơn này`);
    }

    const payment = this.paymentRepository.create(createPaymentDto);
    return await this.paymentRepository.save(payment);
  }

  async findAll(query: FindAllPaymentsDto): Promise<Payment[]> {
    const qb = this.paymentRepository.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.invoice', 'invoice')
      .leftJoinAndSelect('invoice.booking', 'booking')
      .leftJoinAndSelect('booking.user', 'user');

    if (query.invoiceId) {
      qb.andWhere('payment.invoiceId = :invoiceId', { invoiceId: query.invoiceId });
    }

    if (query.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }

    // Sort by created_at desc
    qb.orderBy('payment.created_at', 'DESC');

    return await qb.getMany();
  }

  async findOne(id: string): Promise<Payment> {
    if (!id) {
      throw new BadRequestException('ID thanh toán không được để trống');
    }

    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['invoice', 'invoice.booking', 'invoice.booking.user'],
    });

    if (!payment) {
      throw new NotFoundException(`Không tìm thấy thanh toán với ID ${id}`);
    }

    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.findOne(id);

    // Check if payment is already completed
    if (payment.status === PaymentStatus.PAID) {
      throw new ConflictException('Không thể cập nhật thanh toán đã hoàn thành');
    }

    // Validate status transition
    if (updatePaymentDto.status) {
      if (!Object.values(PaymentStatus).includes(updatePaymentDto.status)) {
        throw new BadRequestException('Trạng thái thanh toán không hợp lệ');
      }

      // Check if status transition is valid
      if (payment.status === PaymentStatus.PENDING && updatePaymentDto.status === PaymentStatus.PAID) {
        // Update invoice paid amount
        const invoice = await this.invoiceRepo.findOne({
          where: { id: payment.invoiceId }
        });
        if (!invoice) {
          throw new NotFoundException(`Không tìm thấy hóa đơn với ID ${payment.invoiceId}`);
        }

        invoice.paidAmount += payment.amount;
        await this.invoiceRepo.save(invoice);

        // Update booking status if all payments are completed
        if (invoice.paidAmount >= invoice.payablePrice) {
          await this.bookingService.update(invoice.booking.id, {
            status: BookingStatus.COMPLETED
          });
        }
      }
    }

    Object.assign(payment, updatePaymentDto);
    return await this.paymentRepository.save(payment);
  }

  async remove(id: string): Promise<void> {
    const payment = await this.findOne(id);

    // Check if payment is already completed
    if (payment.status === PaymentStatus.PAID) {
      throw new ConflictException('Không thể xóa thanh toán đã hoàn thành');
    }

    await this.paymentRepository.remove(payment);
  }

  async createPayOSLink(invoiceId: string, paymentType: PaymentType) {
    if (!invoiceId) {
      throw new BadRequestException('ID hóa đơn không được để trống');
    }

    const invoice = await this.invoiceRepo.findOne({ 
      where: { id: invoiceId },
      relations: ['booking', 'booking.user', 'booking.serviceConcept'],
    });
    
    if (!invoice) {
      throw new NotFoundException(`Không tìm thấy hóa đơn với ID ${invoiceId}`);
    }

    // Check if payment already exists
    const existingPayment = await this.paymentRepository.findOne({
      where: {
        invoiceId,
        type: paymentType,
        status: PaymentStatus.PAID
      }
    });
    if (existingPayment) {
      throw new ConflictException(`Đã tồn tại thanh toán ${paymentType} cho hóa đơn này`);
    }
  
    let amount = 0;
    if (paymentType === PaymentType.DEPOSIT) {
      amount = invoice.depositAmount;
    } else {
      amount = invoice.remainingAmount;
    }
  
    if (amount <= 0) {
      throw new BadRequestException('Số tiền thanh toán không hợp lệ');
    }
  
    const buyerName = invoice.booking?.user?.fullName || 'Khách hàng PhotoGo';
    const serviceConcept = invoice.booking?.serviceConcept;
    const timestamp = Date.now();
    const orderCode = parseInt(`${timestamp}${paymentType === PaymentType.DEPOSIT ? '1' : '2'}`);
    const description = `PG#${orderCode} - ${paymentType === PaymentType.DEPOSIT ? 'Đặt cọc' : 'Thanh toán còn lại'}`;
  
    const paymentLinkData = {
      orderCode,
      amount,
      description,
      returnUrl: this.configService.get<string>('PAYOS_RETURN_URL'),
      cancelUrl: this.configService.get<string>('PAYOS_RETURN_URL'),
      webhookUrl: this.configService.get<string>('PAYOS_WEBHOOK_URL'),
      buyerName,
      items: [
        {
          name: serviceConcept?.name || 'Dịch vụ không xác định',
          quantity: 1,
          price: amount,
        },
      ],
    };
  
    try {
      const paymentLinkRes = await this.payos.createPaymentLink(paymentLinkData);
  
      // Create payment record
      const payment = await this.create({
        invoiceId: invoice.id,
        amount,
        paymentMethod: PaymentMethod.PAYOS,
        status: PaymentStatus.PENDING,
        transactionId: orderCode.toString(),
        type: paymentType,
        description,
        paymentOSId: paymentLinkRes.paymentLinkId,
      });
  
      return {
        checkoutUrl: paymentLinkRes.checkoutUrl,
        paymentLinkId: paymentLinkRes.paymentLinkId,
      };
    } catch (error) {
      console.error('PayOS error:', error);
      throw new BadRequestException('Lỗi khi tạo liên kết thanh toán');
    }
  }

  async handlePayOSWebhook(data: any) {
    if (!data || !data.transactionId) {
      throw new BadRequestException('Dữ liệu webhook không hợp lệ');
    }

    const { status, transactionId } = data;
    
    // Find payment based on transactionId
    const payment = await this.paymentRepository.findOne({ 
      where: { transactionId },
      relations: ['invoice', 'invoice.booking', 'invoice.booking.user', 'invoice.booking.user.voucherUsers', 'invoice.booking.user.voucherUsers.voucher']
    });

    if (!payment) {
      throw new NotFoundException(`Không tìm thấy thanh toán với ID ${transactionId}`);
    }

    const invoice = payment.invoice;

    if (status === 'COMPLETED') {
      // Update payment status
      payment.status = PaymentStatus.PAID;
      await this.paymentRepository.save(payment);

      // Update invoice paid amount
      invoice.paidAmount += payment.amount;
      await this.invoiceRepo.save(invoice);

      // Update voucher status if exists
      const activeVoucherUser = invoice.booking?.user?.voucherUsers?.find(
        vu => vu.status === VoucherUserStatusEnum.USED && vu.voucher
      );
      if (activeVoucherUser?.voucher) {
        try {
          await this.voucherService.updateVoucherUsage(activeVoucherUser.voucher.id);
        } catch (error) {
          console.error('Error updating voucher usage:', error);
        }
      }

      // Update booking status if all payments are completed
      if (invoice.paidAmount >= invoice.payablePrice) {
        await this.bookingService.update(invoice.booking.id, {
          status: BookingStatus.COMPLETED
        });
      }
    } else if (status === 'FAILED') {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepository.save(payment);
    } else {
      throw new BadRequestException(`Trạng thái thanh toán không hợp lệ: ${status}`);
    }
  }
}