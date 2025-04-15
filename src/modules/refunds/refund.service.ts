import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Refund } from './entities/refund.entity';
import { RefundHistory } from './entities/refund-history.entity';
import { CreateRefundDto } from './dto/create-refund.dto';
import { FindAllRefundsDto } from './dto/find-all-refunds.dto';
import { RefundStatus } from '../../constants/booking.enum';

@Injectable()
export class RefundService {
  constructor(
    @InjectRepository(Refund)
    private readonly refundRepository: Repository<Refund>,
    @InjectRepository(RefundHistory)
    private readonly refundHistoryRepository: Repository<RefundHistory>,
  ) {}

  async create(createRefundDto: CreateRefundDto): Promise<Refund> {
    const refund = this.refundRepository.create(createRefundDto);
    refund.status = RefundStatus.PENDING;

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
      throw new NotFoundException(`Refund with ID ${id} not found`);
    }

    return refund;
  }
}