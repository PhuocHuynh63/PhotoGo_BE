import { Inject ,Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { InvoiceStatus, PaymentMethod, PaymentStatus } from '../../constants/booking.enum';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FindAllPaymentsDto } from './dto/find-all-payments.dto';
import { Invoice } from '../invoices/entities/invoice.entity';
import { ConfigService } from '@nestjs/config';
import { BookingStatus } from '../../constants/booking.enum';

import  PayOS  from '@payos/node';
import { BookingService } from '../bookings/booking.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @Inject('PAYOS_CLIENT') private readonly payos: PayOS, // Inject PayOS client
    private readonly configService: ConfigService,
    private readonly bookingService: BookingService,
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

  async createPayOSLink(invoiceId: string) {
    console.log(`Received invoiceId: ${invoiceId}`);
    const invoice = await this.invoiceRepo.findOne({ 
      where: { id: invoiceId },
      relations: ['booking', 'booking.user', 'booking.serviceConcept'],
    });
    
    if (!invoice) {
      throw new NotFoundException(`Hóa đơn với ID ${invoiceId} không tồn tại`);
    }

    const buyerName = invoice.booking?.user?.fullName || 'Khách hàng PhotoGo';
    const serviceConcept = invoice.booking?.serviceConcept;
    const orderCode = Date.now(); // Sử dụng timestamp để đảm bảo unique
    const description = `PG#${orderCode}`;
    const paymentLinkData = {
      orderCode,
      amount: invoice.payablePrice,
      description,
      returnUrl: this.configService.get<string>('PAYOS_RETURN_URL'),
      cancelUrl: this.configService.get<string>('PAYOS_RETURN_URL'),
      webhookUrl: this.configService.get<string>('PAYOS_WEBHOOK_URL'),
      buyerName,
      items: [
        {
          name: serviceConcept?.name || 'Dịch vụ không xác định',
          quantity: 1,
          price: Number(serviceConcept?.price) || 0,
        },
      ],
    };

    try {
      const paymentLinkRes = await this.payos.createPaymentLink(paymentLinkData);
      console.log('Payment link response:', paymentLinkRes);

      await this.paymentRepository.save({
        invoiceId: invoiceId,
        amount: invoice.payablePrice,
        paymentMethod: PaymentMethod.PAYOS,
        status: PaymentStatus.PENDING,
        transactionId: orderCode.toString(),
        paymentOSId: paymentLinkRes.paymentLinkId, // Lưu paymentId từ PayOS
      });

      // Update booking status
      if (invoice.booking && invoice.booking.id) {
        const booking = await this.bookingService.findOne(invoice.booking.id);
        
        if (booking) {
          try {
            await this.bookingService.update(booking.id, {
              status: BookingStatus.COMPLETED
            });
          } catch (error) {
            console.error('Lỗi cập nhật trạng thái booking', error);
            throw error;
          }
        } else {
            console.log('Booking không tồn tại');
        }
      } else {
        console.log('Không tìm thấy booking trong hóa đơn');
      }
        
      return {
        checkoutUrl: paymentLinkRes.checkoutUrl,
      };
    } catch (error) {
      console.error('PayOS error:', error);
      throw new Error('Lỗi khi tạo liên kết thanh toán');
    }
  }

  // handle PayOS webhook
  async handlePayOSWebhook(data: any) {
    const { status, transactionId } = data;
    const payment = await this.paymentRepository.findOne({ where: { transactionId } });
    const invoice = await this.invoiceRepo.findOne({ where: { id: payment.invoiceId } });

    if (!payment) {
      throw new NotFoundException(`Thanh toán với ID ${transactionId} không tồn tại`);
    }

    if (status === 'COMPLETED') {
      payment.status = PaymentStatus.COMPLETED;
      invoice.status = InvoiceStatus.PAID;
    } else if (status === 'FAILED') {
      payment.status = PaymentStatus.FAILED;
      invoice.status = InvoiceStatus.PENDING;
    } else {
      return;
    }

    await this.paymentRepository.save(payment);
    await this.invoiceRepo.save(invoice);
  }

}