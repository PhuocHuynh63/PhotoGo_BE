import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';
import { UpdatePaymentTransactionDto } from './dto/update-payment-transaction.dto';
import { FindAllPaymentTransactionsDto } from './dto/find-all-payments.dto';
import { PaymentStatus } from '../../constants/payment.enum';
import { Between, Raw } from 'typeorm';

@Injectable()
export class PaymentTransactionService {
  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
  ) {}

  async create(createDto: CreatePaymentTransactionDto): Promise<PaymentTransaction> {
    const entity = this.paymentTransactionRepository.create(createDto);
    return this.paymentTransactionRepository.save(entity);
  }

  async findAll(findAllPaymentTransactionsDto: FindAllPaymentTransactionsDto): Promise<{
    data: PaymentTransaction[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const pageNum = Math.max(1, findAllPaymentTransactionsDto.current || 1);
    const pageSizeNum = Math.max(1, findAllPaymentTransactionsDto.pageSize || 10);
    const skip = (pageNum - 1) * pageSizeNum;

    const query = this.paymentTransactionRepository.createQueryBuilder('pt')
      .leftJoinAndSelect('pt.payment', 'payment')
      .leftJoinAndSelect('payment.invoice', 'invoice')
      .leftJoinAndSelect('invoice.booking', 'booking')
      .leftJoinAndSelect('booking.location', 'location')
      .leftJoinAndSelect('location.vendor', 'vendor');

    if (findAllPaymentTransactionsDto.vendorId) {
      query.andWhere('vendor.id = :vendorId', { vendorId: findAllPaymentTransactionsDto.vendorId });
    }
    if (findAllPaymentTransactionsDto.status) {
      query.andWhere('pt.status = :status', { status: findAllPaymentTransactionsDto.status });
    }
    if (findAllPaymentTransactionsDto.type) {
      query.andWhere('pt.type = :type', { type: findAllPaymentTransactionsDto.type });
    }

    const [data, total] = await query.skip(skip).take(pageSizeNum).getManyAndCount();
    const totalPage = Math.ceil(total / pageSizeNum);
    return {
      data,
      pagination: {
        current: pageNum,
        pageSize: pageSizeNum,
        totalPage,
        totalItem: total,
      },
    };
  }

  async findOne(id: string): Promise<PaymentTransaction> {
    const entity = await this.paymentTransactionRepository.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Không tìm thấy lịch sử giao dịch');
    return entity;
  }

  async update(id: string, updateDto: UpdatePaymentTransactionDto): Promise<PaymentTransaction> {
    await this.paymentTransactionRepository.update(id, updateDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.paymentTransactionRepository.delete(id);
  }

  async getRevenueStatistics(year?: number) {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    // Lấy tất cả transaction PAID trong năm
    const start = new Date(targetYear, 0, 1, 0, 0, 0, 0);
    const end = new Date(targetYear + 1, 0, 1, 0, 0, 0, 0);
    const allPaid = await this.paymentTransactionRepository.find({
      where: {
        status: PaymentStatus.PAID,
        createdAt: Between(start, end),
      },
    });
    // Tổng doanh thu cả năm
    const total = allPaid.reduce((sum, t) => sum + (t.amount || 0), 0);
    // Doanh thu từng tháng
    const monthly: number[] = Array(12).fill(0);
    allPaid.forEach(t => {
      const month = t.createdAt.getMonth(); // 0-11
      monthly[month] += t.amount || 0;
    });
    return {
      year: targetYear,
      total,
      monthly, // [tháng 1, tháng 2, ..., tháng 12]
    };
  }
} 