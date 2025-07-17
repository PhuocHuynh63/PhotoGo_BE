import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { FindSubscriptionDto } from './dto/find-subscription.dto';
import { SubscriptionStatus, SubscriptionHistoryAction, PlanType } from '../../constants/subscription.enum';
import { PayerType } from '../../constants/payment.enum';
import { SubscriptionHistoryService } from './subscription-history.service';
import { SubscriptionPlanService } from './subscription-plan.service';
import { BillingCycle } from '../../constants/subscription.enum';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly subscriptionHistoryService: SubscriptionHistoryService,
    private readonly subscriptionPlanService: SubscriptionPlanService,
  ) {}

  private getDurationByBillingCycle(billingCycle: BillingCycle): number {
    switch (billingCycle) {
      case BillingCycle.MONTHLY:
        return 30;
      case BillingCycle.YEARLY:
        return 365;
      default:
        return 30;
    }
  }

  async create(createSubscriptionDto: CreateSubscriptionDto): Promise<Subscription> {
    // Validate plan exists and is active
    const plan = await this.subscriptionPlanService.findOne(createSubscriptionDto.planId);
    if (!plan.isActive) {
      throw new BadRequestException('Subscription plan không hoạt động');
    }

    // Kiểm tra loại plan phù hợp với loại đăng ký
    if (createSubscriptionDto.userId && plan.planType !== PlanType.USER) {
      throw new BadRequestException('Chỉ được đăng ký gói dành cho người dùng');
    }
    // Nếu sau này có vendorId thì kiểm tra planType === 'VENDOR'

    // Check if user already has an active subscription
    if (createSubscriptionDto.userId) {
      const existingSubscription = await this.subscriptionRepository.findOne({
        where: { 
          userId: createSubscriptionDto.userId,
          status: SubscriptionStatus.ACTIVE
        }
      });
      if (existingSubscription) {
        throw new BadRequestException('User đã có subscription đang hoạt động');
      }
    }

    // Calculate endDate if not provided
    let endDate = createSubscriptionDto.endDate ? new Date(createSubscriptionDto.endDate) : null;
    if (!endDate) {
      const startDate = new Date(createSubscriptionDto.startDate);
      endDate = new Date(startDate);
      if (plan.billingCycle === BillingCycle.MONTHLY) {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (plan.billingCycle === BillingCycle.YEARLY) {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }
    }
    // Lấy giá theo billingCycle
    let price = 0;
    if (plan.billingCycle === BillingCycle.MONTHLY) {
      price = plan.priceForMonth;
    } else if (plan.billingCycle === BillingCycle.YEARLY) {
      price = plan.priceForYear;
    }
    const subscription = this.subscriptionRepository.create({
      ...createSubscriptionDto,
      endDate: endDate,
      status: SubscriptionStatus.ACTIVE,
      // price: price // Nếu muốn lưu giá vào subscription
    });
    const savedSubscription = await this.subscriptionRepository.save(subscription);

    // Tạo history record cho subscription mới
    await this.subscriptionHistoryService.createHistory(
      savedSubscription.id,
      SubscriptionHistoryAction.CREATED,
      `Tạo mới subscription`,
      {
        // Thông tin subscription
        subscriptionId: savedSubscription.id,
        userId: savedSubscription.userId,
        planId: savedSubscription.planId,
        // Thông tin thời gian
        startDate: savedSubscription.startDate.toISOString(),
        endDate: savedSubscription.endDate.toISOString(),
        billingCycle: savedSubscription.billingCycle,
        status: savedSubscription.status,
        // Metadata khác
        timestamp: new Date().toISOString(),
        action: 'create',
      },
      PayerType.CUSTOMER
    );

    return savedSubscription;
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

    if (findSubscriptionDto.userId) {
      queryBuilder.andWhere('subscription.userId = :userId', { userId: findSubscriptionDto.userId });
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
      relations: ['user', 'plan'],
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
    const oldStatus = subscription.status;
    
    subscription.status = SubscriptionStatus.CANCELED;
    subscription.nextBillingAt = null;
    const updatedSubscription = await this.subscriptionRepository.save(subscription);

    // Tạo history record cho việc hủy subscription
    await this.subscriptionHistoryService.createHistory(
      subscription.id,
      SubscriptionHistoryAction.CANCELLED,
      `Hủy subscription`,
      {
        // Thông tin subscription
        subscriptionId: subscription.id,
        userId: subscription.userId,
        planId: subscription.planId,
        
        // Thông tin thay đổi
        oldStatus: oldStatus,
        newStatus: subscription.status,
        cancelDate: new Date().toISOString(),
        endDate: subscription.endDate.toISOString(),
        
        // Metadata khác
        timestamp: new Date().toISOString(),
        action: 'cancel',
        reason: 'User requested cancellation',
      },
      PayerType.CUSTOMER
    );

    return updatedSubscription;
  }

  async remove(id: string): Promise<void> {
    const subscription = await this.findOne(id);
    await this.subscriptionRepository.remove(subscription);
  }
} 