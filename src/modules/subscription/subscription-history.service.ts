import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionHistory } from './entities/subscription-history.entity';
import { SubscriptionHistoryAction } from '../../constants/subscription.enum';
import { PayerType } from '../../constants/payment.enum';

@Injectable()
export class SubscriptionHistoryService {
  constructor(
    @InjectRepository(SubscriptionHistory)
    private readonly subscriptionHistoryRepository: Repository<SubscriptionHistory>,
  ) {}

  async createHistory(
    subscriptionId: string,
    action: SubscriptionHistoryAction,
    description?: string,
    metadata?: any,
    payerType: PayerType = PayerType.CUSTOMER,
  ): Promise<SubscriptionHistory> {
    const history = this.subscriptionHistoryRepository.create({
      subscriptionId,
      action,
      description,
      metadata,
      payerType,
    });
    return await this.subscriptionHistoryRepository.save(history);
  }

  async findBySubscriptionId(subscriptionId: string): Promise<SubscriptionHistory[]> {
    return await this.subscriptionHistoryRepository.find({
      where: { subscriptionId },
      order: { createdAt: 'DESC' },
    });
  }

  async findRecentBySubscriptionId(subscriptionId: string, limit: number = 10): Promise<SubscriptionHistory[]> {
    return await this.subscriptionHistoryRepository.find({
      where: { subscriptionId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
} 