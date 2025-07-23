import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { FindSubscriptionDto, HistoryDto, PaginationDto } from './dto/find-subscription.dto';
import { BillingCycle, PlanType, SubscriptionStatus, SubscriptionHistoryAction } from 'src/constants/subscription.enum';
import { PayerType } from '../../constants/payment.enum';
import { SubscriptionHistoryService } from './subscription-history.service';
import { SubscriptionPlanService } from './subscription-plan.service';
import { BullQueueService } from '../../3rdService/bull/bull-queue.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SubscriptionReminderJobData } from './bull/subscription.processor';
import { SubscriptionHistory } from './entities/subscription-history.entity';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly subscriptionHistoryService: SubscriptionHistoryService,
    private readonly subscriptionPlanService: SubscriptionPlanService,
    private readonly bullQueueService: BullQueueService,
    @InjectQueue('subscription-reminders') private readonly reminderQueue: Queue,
  ) { }

  //#region create 

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


    // Parse nextBilledAt from DTO if provided
    let nextBillingAt: Date | null = null;
    if (createSubscriptionDto.nextBilledAt) {
      nextBillingAt = new Date(createSubscriptionDto.nextBilledAt);
    }

    const subscription = this.subscriptionRepository.create({
      ...createSubscriptionDto,
      endDate: endDate,
      nextBillingAt: nextBillingAt,
      status: SubscriptionStatus.ACTIVE
    });
    const savedSubscription = await this.subscriptionRepository.save(subscription);

    // Schedule renewal reminder if nextBillingAt is set and user exists
    if (nextBillingAt && savedSubscription.userId) {
      await this.scheduleRenewalReminder(savedSubscription);
    }

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
        nextBillingAt: savedSubscription.nextBillingAt?.toISOString(),
        billingCycle: savedSubscription.billingCycle,
        status: savedSubscription.status,

        // Metadata khác
        timestamp: new Date().toISOString(),
        action: 'create',
        reminderScheduled: !!(nextBillingAt && savedSubscription.userId),
      },
      PayerType.CUSTOMER
    );

    return savedSubscription;
  }
  //#endregion create

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
    const oldNextBillingAt = subscription.nextBillingAt;

    // Parse nextBilledAt from DTO if provided
    if (updateSubscriptionDto.nextBilledAt) {
      updateSubscriptionDto.nextBilledAt = new Date(updateSubscriptionDto.nextBilledAt).toISOString();
    }

    Object.assign(subscription, updateSubscriptionDto);
    const updatedSubscription = await this.subscriptionRepository.save(subscription);

    // Handle renewal reminder scheduling if nextBillingAt changed
    const newNextBillingAt = updatedSubscription.nextBillingAt;

    if (updatedSubscription.userId) {
      // Cancel old reminder if nextBillingAt changed
      if (oldNextBillingAt &&
        (!newNextBillingAt || oldNextBillingAt.getTime() !== newNextBillingAt.getTime())) {
        await this.cancelRenewalReminder(updatedSubscription.id);
      }

      // Schedule new reminder if nextBillingAt is set
      if (newNextBillingAt && updatedSubscription.status === SubscriptionStatus.ACTIVE) {
        await this.scheduleRenewalReminder(updatedSubscription);
      }
    }

    return updatedSubscription;
  }

  async cancel(id: string): Promise<Subscription> {
    const subscription = await this.findOne(id);
    const oldStatus = subscription.status;

    // Huỷ lịch hẹn thời gian nhắc gia hạn subscription
    await this.cancelRenewalReminder(id);

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
        reminderCancelled: true,
      },
      PayerType.CUSTOMER
    );

    return updatedSubscription;
  }

  async remove(id: string): Promise<void> {
    // Huỷ lịch hẹn thời gian nhắc gia hạn subscription trước khi xóa
    await this.cancelRenewalReminder(id);

    const subscription = await this.findOne(id);
    await this.subscriptionRepository.remove(subscription);
  }

  //#region scheduleRenewalReminder
  /**
   * Lịch hẹn thời gian nhắc gia hạn subscription 24 giờ trước nextBillingAt
   */
  async scheduleRenewalReminder(subscription: Subscription): Promise<void> {
    if (!subscription.nextBillingAt || !subscription.userId) {
      this.logger.warn(`Không thể schedule reminder: nextBillingAt hoặc userId không tồn tại cho subscription ${subscription.id}`);
      return;
    }

    try {
      const reminderTime = new Date(subscription.nextBillingAt);
      reminderTime.setHours(reminderTime.getHours() - 24); // 24 hours before

      const now = new Date();

      // Don't schedule if reminder time is in the past
      if (reminderTime <= now) {
        this.logger.warn(`Reminder time đã qua cho subscription ${subscription.id}, bỏ qua scheduling`);
        return;
      }

      const delay = reminderTime.getTime() - now.getTime();

      const jobData: SubscriptionReminderJobData = {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        nextBillingAt: subscription.nextBillingAt,
      };

      const jobAdded = await this.bullQueueService.addJob(
        this.reminderQueue,
        'send-renewal-reminder',
        jobData,
        {
          delay: delay,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      if (jobAdded) {
        this.logger.log(`Đã schedule reminder cho subscription ${subscription.id} vào ${reminderTime.toISOString()}`);
      } else {
        this.logger.warn(`Không thể schedule reminder cho subscription ${subscription.id} do lỗi Redis`);
      }

    } catch (error) {
      this.logger.error(`Lỗi khi schedule renewal reminder cho subscription ${subscription.id}: ${error.message}`, error.stack);
    }
  }
  //#endregion scheduleRenewalReminder

  //#region cancelRenewalReminder
  /**
   * Huỷ lịch hẹn thời gian nhắc gia hạn subscription
   */
  private async cancelRenewalReminder(subscriptionId: string): Promise<void> {
    try {
      // Find jobs by pattern and remove them
      const jobs = await this.reminderQueue.getJobs(['delayed', 'waiting'], 0, -1);

      for (const job of jobs) {
        if (job.data && job.data.subscriptionId === subscriptionId) {
          await job.remove();
          this.logger.log(`Đã cancel reminder job cho subscription ${subscriptionId}`);
          break;
        }
      }
    } catch (error) {
      this.logger.error(`Lỗi khi cancel renewal reminder cho subscription ${subscriptionId}: ${error.message}`, error.stack);
    }
  }
  //#endregion cancelRenewalReminder

  //#region scheduleCleanupJob
  /**
   * Lịch hẹn thời gian làm sạch subscription hết hạn
   */
  async schedulePeriodicCleanup(): Promise<void> {
    try {
      // Schedule cleanup to run immediately (can be called periodically by cron or admin)
      const jobAdded = await this.bullQueueService.addJob(
        this.reminderQueue,
        'cleanup-expired-subscriptions',
        {},
        {
          attempts: 3,
          backoff: { type: 'fixed', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: true,
        }
      );

      if (jobAdded) {
        this.logger.log('Đã schedule cleanup job cho expired subscriptions');
      }
    } catch (error) {
      this.logger.error(`Lỗi khi schedule cleanup: ${error.message}`, error.stack);
    }
  }
  //#endregion scheduleCleanupJob

  /**
   * Lấy lịch sử subscription của user, group theo từng subscription, có phân trang và sắp xếp
   */
  async getGroupedSubscriptionHistoryByUserIdWithPagination(userId: string, historyDto: HistoryDto) {
    // Lấy tất cả subscription của user (bao gồm cả plan)
    let subscriptions = await this.subscriptionRepository.find({
      where: { userId },
      relations: ['plan'],
    });
    // Sắp xếp
    if (historyDto.sortBy && ['createdAt', 'updatedAt'].includes(historyDto.sortBy)) {
      const dir = historyDto.sortDirection === 'asc' ? 1 : -1;
      subscriptions = subscriptions.sort((a, b) => {
        const aVal = a[historyDto.sortBy] instanceof Date ? a[historyDto.sortBy].getTime() : a[historyDto.sortBy];
        const bVal = b[historyDto.sortBy] instanceof Date ? b[historyDto.sortBy].getTime() : b[historyDto.sortBy];
        if (aVal < bVal) return -1 * dir;
        if (aVal > bVal) return 1 * dir;
        return 0;
      });
    } else {
      subscriptions = subscriptions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    // Lấy lịch sử cho từng subscription, lọc theo action nếu có
    const result = [];
    for (const sub of subscriptions) {
      let history = await this.subscriptionHistoryService.findBySubscriptionId(sub.id);
      if (historyDto.action) {
        history = history.filter(h => h.action === historyDto.action);
      }
      result.push({
        subscription: {
          id: sub.id,
          startDate: sub.startDate,
          endDate: sub.endDate,
          status: sub.status,
          billingCycle: sub.billingCycle,
          lastBilledAt: sub.lastBilledAt,
          nextBillingAt: sub.nextBillingAt,
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
        },
        plan: sub.plan,
        historyDetails: history,
      });
    }
    // Phân trang
    const pageNum = Math.max(1, historyDto.current || 1);
    const pageSizeNum = Math.max(1, historyDto.pageSize || 10);
    const totalRecords = Math.max(1, result.length);
    const totalPage = Math.ceil(totalRecords / pageSizeNum);
    const paged = result.slice((pageNum - 1) * pageSizeNum, pageNum * pageSizeNum);
    return {
      history: paged,
      totalRecords,
      pagination: {
        current: pageNum,
        pageSize: pageSizeNum,
        totalPage,
        totalItem: totalRecords,
      },
    };
  }
} 