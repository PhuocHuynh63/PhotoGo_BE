import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Refund } from './entities/refund.entity';
import { RefundHistory } from './entities/refund-history.entity';
import { CreateRefundDto } from './dto/create-refund.dto';
import { FindAllRefundsDto } from './dto/find-all-refunds.dto';
import { PaymentStatus , RefundStatus } from '../../constants/booking.enum';
import { Payment } from '../payments/entities/payment.entity';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common/exceptions';
import { PayOSService } from 'src/3rdService/payos/payos.service';

@Injectable()
export class RefundService {
  constructor(
    @InjectRepository(Refund)
    private readonly refundRepository: Repository<Refund>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(RefundHistory)
    private readonly refundHistoryRepository: Repository<RefundHistory>,
    private readonly payos: PayOSService,
  ) {}

  async create(createRefundDto: CreateRefundDto): Promise<Refund> {
    const refund = this.refundRepository.create(createRefundDto);
    refund.status = RefundStatus.PENDING; // Ensure RefundStatus is used instead of PaymentStatus

    const savedRefund = await this.refundRepository.save(refund);

    // Create a refund history entry
    const refundHistory = this.refundHistoryRepository.create({
      refundId: savedRefund.id,
      status: RefundStatus.PENDING,
    });
    await this.refundHistoryRepository.save(refundHistory);

    return savedRefund;
  }

  async findAll(query: FindAllRefundsDto): Promise<Refund[]> {
    const qb = this.refundRepository.createQueryBuilder('refund');

    if (query.invoiceId) {
      qb.andWhere('refund.invoiceId = :invoiceId', { invoiceId: query.invoiceId });
    }

    if (query.status) {
      qb.andWhere('refund.status = :status', { status: query.status });
    }

    return await qb.getMany();
  }

  async findOne(id: string): Promise<Refund> {
    const refund = await this.refundRepository.findOne({
      where: { id },
      relations: ['invoice', 'histories'],
    });

    if (!refund) {
      throw new NotFoundException(`Hoàn trả với ID ${id} không tồn tại`);
    }

    return refund;
  }

  async refundPayment(paymentId: string, createRefundDto: CreateRefundDto): Promise<any> {
    const { amount, reason } = createRefundDto;
  
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException(`Thanh toán với ID ${paymentId} không tồn tại`);
    }
  
    if (!payment.paymentOSId) {
      throw new BadRequestException('Thanh toán không có ID PayOS hợp lệ');
    }
  
    if (amount > payment.amount) {
      throw new BadRequestException('Số tiền hoàn trả không thể lớn hơn số tiền thanh toán');
    }
  
    try {
      const refundData = {
        amount: amount || payment.amount,
        description: reason || 'Hoàn tiền theo yêu cầu',
      };
  
      const refundResponse = await this.payos.refundPayment(payment.paymentOSId, refundData);
  
      // Tạo bản ghi Refund
      const refund = await this.refundRepository.save({
        invoiceId: payment.invoiceId,
        amount: refundData.amount,
        reason: refundData.description,
        status: RefundStatus.COMPLETED,
      });
  
      // Tạo bản ghi RefundHistory
      await this.refundHistoryRepository.save({
        refundId: refund.id,
        status: RefundStatus.COMPLETED,
      });
  
      // Cập nhật trạng thái Payment
      payment.status = PaymentStatus.REFUNDED;
      await this.paymentRepository.save(payment);
  
      return {
        message: 'Hoàn trả thành công',
        data: {
          refundId: refund.id,
          amount: refundResponse.amount,
          date: refundResponse.date,
        },
      };
    } catch (error) {
      console.error('Refund error:', error?.response?.data || error.message || error);
      throw new InternalServerErrorException(`Hoàn trả thất bại: ${error.message}`);
    }
  }
  
}