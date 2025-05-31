import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    const payment = this.paymentRepository.create(createPaymentDto);
    return await this.paymentRepository.save(payment);
  }

  async findAll(query: FindAllPaymentsDto): Promise<Payment[]> {
    const qb = this.paymentRepository.createQueryBuilder('payment');

    if (query.invoiceId) {
      qb.andWhere('payment.invoiceId = :invoiceId', { invoiceId: query.invoiceId });
    }

    if (query.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }

    return await qb.getMany();
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['invoice'],
    });

    if (!payment) {
      throw new NotFoundException(`Thanh toán với ID ${id} không tồn tại`);
    }

    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.findOne(id);
    Object.assign(payment, updatePaymentDto);
    return await this.paymentRepository.save(payment);
  }

  async remove(id: string): Promise<void> {
    const payment = await this.findOne(id);
    await this.paymentRepository.remove(payment);
  }

  async createPayOSLink(invoiceId: string, paymentType: PaymentType) {
    const invoice = await this.invoiceRepo.findOne({ 
      where: { id: invoiceId },
      relations: ['booking', 'booking.user', 'booking.serviceConcept'],
    });
    
    if (!invoice || !invoice.id) {
      throw new NotFoundException(`Hóa đơn với ID ${invoiceId} không tồn tại hoặc không có ID hợp lệ`);
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
      console.log('Payment link response:', paymentLinkRes);
  
      // Tạo payment record
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
      throw new Error('Lỗi khi tạo liên kết thanh toán');
    }
  }

  async handlePayOSWebhook(data: any) {
    const { status, transactionId } = data;
    
    // Tìm payment dựa trên transactionId
    const payment = await this.paymentRepository.findOne({ 
      where: { transactionId },
      relations: ['invoice', 'invoice.booking', 'invoice.booking.user', 'invoice.booking.user.voucherUsers', 'invoice.booking.user.voucherUsers.voucher']
    });

    if (!payment) {
      throw new NotFoundException(`Thanh toán với ID ${transactionId} không tồn tại`);
    }

    const invoice = payment.invoice;

    if (status === 'COMPLETED') {
      // Cập nhật trạng thái payment
      payment.status = PaymentStatus.PAID;
      await this.paymentRepository.save(payment);

      // Cập nhật số tiền đã thanh toán của invoice
      invoice.paidAmount += payment.amount;
      await this.invoiceRepo.save(invoice);

      // Cập nhật trạng thái voucher nếu có
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

      // Cập nhật trạng thái booking nếu đã thanh toán đủ
      if (invoice.paidAmount >= invoice.payablePrice) {
        await this.bookingService.update(invoice.booking.id, {
          status: BookingStatus.COMPLETED
        });
      }
    } else if (status === 'FAILED') {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepository.save(payment);
    }
  }
}