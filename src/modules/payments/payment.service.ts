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
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { BookingHistory } from '../bookings/entities/booking-history.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { PaymentCallbackDto } from './dto/payment-callback.dto';
import { KafkaService } from '../../3rdService/kafka/kafka.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BookingHistory)
    private readonly bookingHistoryRepository: Repository<BookingHistory>,
    @Inject('PAYOS_CLIENT') private readonly payos: PayOS,
    private readonly configService: ConfigService,
    private readonly voucherService: VoucherService,
    private readonly kafkaService: KafkaService,
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

        Object.assign(payment, updatePaymentDto);
        return await this.paymentRepository.save(payment);
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
      returnUrl: `https://photogo.id.vn/payment/successful?paymentId=${orderCode}&status=success`,
      cancelUrl: `https://photogo.id.vn/payment/error?paymentId=${orderCode}&status=error`,
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
      relations: [
        'invoice', 
        'invoice.booking', 
        'invoice.booking.user', 
        'invoice.booking.user.voucherUsers', 
        'invoice.booking.user.voucherUsers.voucher',
        'invoice.booking.histories'
      ]
    });

    if (!payment) {
      throw new NotFoundException(`Không tìm thấy thanh toán với ID ${transactionId}`);
    }

    const invoice = payment.invoice;
    const booking = invoice.booking;

    if (status === 'COMPLETED') {
      // Update payment status
      payment.status = PaymentStatus.PAID;
      await this.paymentRepository.save(payment);

      // Update invoice status and paid amount
      invoice.paidAmount += payment.amount;
      if (payment.type === PaymentType.DEPOSIT) {
        invoice.status = InvoiceStatus.PARTIALLY_PAID;
      } else if (payment.type === PaymentType.REMAINING) {
        invoice.status = InvoiceStatus.PAID;
      }
      await this.invoiceRepo.save(invoice);

      // Update booking status
      if (payment.type === PaymentType.DEPOSIT) {
        booking.status = BookingStatus.CONFIRMED;
      } else if (payment.type === PaymentType.REMAINING) {
        booking.status = BookingStatus.COMPLETED;
      }
      await this.bookingRepository.save(booking);

      // Create booking history
      const history = this.bookingHistoryRepository.create({
        bookingId: booking.id,
        status: booking.status,
      });
      await this.bookingHistoryRepository.save(history);

      // Handle voucher if exists
      const activeVoucherUser = booking?.user?.voucherUsers?.find(
        vu => vu.status === VoucherUserStatusEnum.USED && vu.voucher
      );
      if (activeVoucherUser?.voucher) {
        try {
          await this.voucherService.updateVoucherUsage(activeVoucherUser.voucher.id);
        } catch (error) {
          console.error('Error updating voucher usage:', error);
        }
      }

      // Gửi event khi thanh toán thành công
      await this.kafkaService.sendMessage('payment-processing', {
        type: 'PAYMENT_SUCCESS',
        data: {
          bookingId: booking.id,
          invoiceId: invoice.id,
          email: booking.email,
          fullName: booking.fullName,
          serviceName: booking.serviceConcept.name,
          date: booking.date,
          time: booking.time,
          totalAmount: payment.amount,
          paidAmount: payment.amount,
          voucherCode: activeVoucherUser?.voucher?.code,
          discountAmount: invoice.discountAmount,
          issuedAt: new Date(),
        },
      });

      return payment;
    } else if (status === 'FAILED') {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepository.save(payment);
    } else {
      throw new BadRequestException(`Trạng thái thanh toán không hợp lệ: ${status}`);
    }
  }

  async handlePaymentSuccess(callbackData: PaymentCallbackDto) {
    const { paymentId, status, code, id, orderCode } = callbackData;

    // Find payment based on transactionId (orderCode)
    const payment = await this.paymentRepository.findOne({ 
      where: { transactionId: orderCode },
      relations: [
        'invoice', 
        'invoice.booking', 
        'invoice.booking.user', 
        'invoice.booking.user.voucherUsers', 
        'invoice.booking.user.voucherUsers.voucher',
        'invoice.booking.histories'
      ]
    });

    if (!payment) {
      throw new NotFoundException(`Không tìm thấy thanh toán với ID ${orderCode}`);
    }

    const invoice = payment.invoice;
    const booking = invoice.booking;

    // Update payment status
    payment.status = PaymentStatus.PAID;
    await this.paymentRepository.save(payment);

    // Update invoice status and paid amount
    invoice.paidAmount += payment.amount;
    if (payment.type === PaymentType.DEPOSIT) {
      invoice.status = InvoiceStatus.PARTIALLY_PAID;
    } else if (payment.type === PaymentType.REMAINING) {
      invoice.status = InvoiceStatus.PAID;
    }
    await this.invoiceRepo.save(invoice);

    // Update booking status
    if (payment.type === PaymentType.DEPOSIT) {
      booking.status = BookingStatus.CONFIRMED;
    } else if (payment.type === PaymentType.REMAINING) {
      booking.status = BookingStatus.COMPLETED;
    }
    await this.bookingRepository.save(booking);

    // Create booking history
    const history = this.bookingHistoryRepository.create({
      bookingId: booking.id,
      status: booking.status,
    });
    await this.bookingHistoryRepository.save(history);

    // Handle voucher if exists
    const activeVoucherUser = booking?.user?.voucherUsers?.find(
      vu => vu.status === VoucherUserStatusEnum.USED && vu.voucher
    );
    if (activeVoucherUser?.voucher) {
      try {
        await this.voucherService.updateVoucherUsage(activeVoucherUser.voucher.id);
      } catch (error) {
        console.error('Error updating voucher usage:', error);
      }
    }
  }

  async handlePaymentError(callbackData: PaymentCallbackDto) {
    const { paymentId, status, code, id, orderCode } = callbackData;

    // Find payment based on transactionId (orderCode)
    const payment = await this.paymentRepository.findOne({ 
      where: { transactionId: orderCode },
      relations: [
        'invoice', 
        'invoice.booking', 
        'invoice.booking.histories'
      ]
    });

    if (!payment) {
      throw new NotFoundException(`Không tìm thấy thanh toán với ID ${orderCode}`);
    }

    // Update payment status to failed
    payment.status = PaymentStatus.FAILED;
    await this.paymentRepository.save(payment);

    // Update invoice status (nếu muốn)
    const invoice = payment.invoice;
    if (invoice) {
      invoice.status = InvoiceStatus.CANCELLED;
      await this.invoiceRepo.save(invoice);
    }

    // Update booking status (nếu muốn)
    const booking = invoice?.booking;
    if (booking) {
      booking.status = BookingStatus.CANCELLED;
      await this.bookingRepository.save(booking);

      // Create booking history
      const history = this.bookingHistoryRepository.create({
        bookingId: booking.id,
        status: BookingStatus.CANCELLED,
      });
      await this.bookingHistoryRepository.save(history);
    }
  }
}