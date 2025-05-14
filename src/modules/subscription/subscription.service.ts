import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { FindSubscriptionDto } from './dto/find-subscription.dto';
import { SubscriptionStatus } from '../../constants/subscription.enum';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  async create(createSubscriptionDto: CreateSubscriptionDto): Promise<Subscription> {
    const subscription = this.subscriptionRepository.create(createSubscriptionDto);
    return await this.subscriptionRepository.save(subscription);
  }

  async findAll(findSubscriptionDto: FindSubscriptionDto): Promise<{
    data: Subscription[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const currentPage = findSubscriptionDto.current ? Number(findSubscriptionDto.current) : 1;
    const pageSize = findSubscriptionDto.pageSize ? Number(findSubscriptionDto.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;

    const queryBuilder = this.subscriptionRepository.createQueryBuilder('subscription');
    queryBuilder.leftJoinAndSelect('subscription.user', 'user');
    queryBuilder.leftJoinAndSelect('subscription.plan', 'plan');
    queryBuilder.leftJoinAndSelect('subscription.vendor', 'vendor');

    if (findSubscriptionDto.userId) {
      queryBuilder.andWhere('subscription.userId = :userId', { userId: findSubscriptionDto.userId });
    }

    if (findSubscriptionDto.vendorId) {
      queryBuilder.andWhere('subscription.vendorId = :vendorId', { vendorId: findSubscriptionDto.vendorId });
    }

    if (findSubscriptionDto.status) {
      queryBuilder.andWhere('subscription.status = :status', { status: findSubscriptionDto.status });
    }

    const [data, totalItem] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    const totalPage = Math.ceil(totalItem / pageSize);

    return {
      data,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage,
        totalItem,
      },
    };
  }

  async findOne(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
      relations: ['user', 'plan', 'vendor'],
    });

    if (!subscription) {
      throw new NotFoundException('Không tìm thấy gói đăng ký');
    }

    return subscription;
  }

  async update(id: string, updateSubscriptionDto: UpdateSubscriptionDto): Promise<Subscription> {
    const subscription = await this.findOne(id);
    Object.assign(subscription, updateSubscriptionDto);
    return await this.subscriptionRepository.save(subscription);
  }

  async cancel(id: string): Promise<Subscription> {
    const subscription = await this.findOne(id);
    subscription.status = SubscriptionStatus.CANCELED;
    subscription.nextBillingAt = null;
    return await this.subscriptionRepository.save(subscription);
  }

  async remove(id: string): Promise<void> {
    const subscription = await this.findOne(id);
    await this.subscriptionRepository.remove(subscription);
  }
} 