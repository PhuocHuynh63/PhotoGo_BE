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

  async getRevenueStatistics(year?: number, vendorId?: string) {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const start = new Date(targetYear, 0, 1, 0, 0, 0, 0);
    const end = new Date(targetYear + 1, 0, 1, 0, 0, 0, 0);

    const query = this.paymentTransactionRepository.createQueryBuilder('pt')
      .leftJoinAndSelect('pt.payment', 'payment')
      .leftJoinAndSelect('payment.invoice', 'invoice')
      .leftJoinAndSelect('invoice.booking', 'booking')
      .leftJoinAndSelect('booking.location', 'location')
      .leftJoinAndSelect('location.vendor', 'vendor')
      .where('pt.status = :status', { status: PaymentStatus.PAID })
      .andWhere('pt.createdAt >= :start AND pt.createdAt < :end', { start, end });

    if (vendorId) {
      query.andWhere('vendor.id = :vendorId', { vendorId });
    }

    const allPaid = await query.getMany();
    const total = allPaid.reduce((sum, t) => sum + (t.amount || 0), 0);
    const monthly: number[] = Array(12).fill(0);
    allPaid.forEach(t => {
      const month = t.createdAt.getMonth();
      monthly[month] += t.amount || 0;
    });

    let transactionsByVendor = undefined;
    if (!vendorId) {
      transactionsByVendor = {};
      for (const t of allPaid) {
        const vendor = t.payment?.invoice?.booking?.location?.vendor;
        const vId = vendor?.id || 'unknown';
        const vName = vendor?.name || 'Không xác định';
        if (!transactionsByVendor[vId]) {
          transactionsByVendor[vId] = { vendorName: vName, transactions: [] };
        }
        transactionsByVendor[vId].transactions.push({
          id: t.id,
          amount: t.amount,
          paymentMethod: t.paymentMethod,
          status: t.status,
          type: t.type,
          description: t.description,
          transactionId: t.transactionId,
          paymentId: t.paymentId,
          vendorId: vId,
          vendorName: vName,
        });
      }
    }

    return {
      year: targetYear,
      total,
      monthly,
      ...(transactionsByVendor ? { transactionsByVendor } : {}),
    };
  }
} 