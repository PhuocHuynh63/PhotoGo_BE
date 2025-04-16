import { Inject ,Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentMethod, PaymentStatus } from '../../constants/booking.enum';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FindAllPaymentsDto } from './dto/find-all-payments.dto';
import { Invoice } from '../invoices/entities/invoice.entity';
import { ConfigService } from '@nestjs/config';

import  PayOS  from '@payos/node';


@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @Inject('PAYOS_CLIENT') private readonly payos: PayOS, // Inject PayOS client
    private readonly configService: ConfigService,
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
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async createPayOSLink(invoiceId: string) {
    console.log(`Received invoiceId: ${invoiceId}`);
    const invoice = await this.invoiceRepo.findOne({ 
      where: { id: invoiceId },
      relations: ['booking', 'booking.user', 'booking.servicePackage'],
    });
    
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    const buyerName = invoice.booking?.user?.fullName || 'Khách hàng PhotoGo';
    const servicePackage = invoice.booking?.servicePackage;
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
          name: servicePackage?.name || 'Dịch vụ không xác định',
          quantity: 1,
          price: Number(servicePackage?.price) || 0,
        },
      ],
    };

    try {
      const paymentLinkRes = await this.payos.createPaymentLink(paymentLinkData);

      await this.paymentRepository.save({
        invoiceId: invoiceId,
        amount: invoice.payablePrice,
        paymentMethod: PaymentMethod.PAYOS,
        status: PaymentStatus.PENDING,
        transactionId: orderCode.toString(),
      });

      return {
        checkoutUrl: paymentLinkRes.checkoutUrl,
      };
    } catch (error) {
      console.error('PayOS error:', error);
      throw new Error('Failed to create payment link');
    }
  }

  // handle PayOS webhook
  async handlePayOSWebhook(data: any) {
    const { orderCode, status, transactionId } = data;
    const payment = await this.paymentRepository.findOne({ where: { transactionId } });

    if (!payment) {
      throw new NotFoundException(`Payment with transaction ID ${transactionId} not found`);
    }

    if (status === 'COMPLETED') {
      payment.status = PaymentStatus.COMPLETED;
    } else if (status === 'FAILED') {
      payment.status = PaymentStatus.FAILED;
    } else {
      return;
    }

    await this.paymentRepository.save(payment);
  }

}