import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionService } from '../subscription.service';
import { NotificationService } from '../../notifications/notification.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';
import { User } from '../../users/entities/user.entity';
import { SubscriptionStatus } from '../../../constants/subscription.enum';

export interface SubscriptionReminderJobData {
    subscriptionId: string;
    userId: string;
    nextBillingAt: Date;
}

@Processor('subscription-reminders')
@Injectable()
export class SubscriptionProcessor {
    private readonly logger = new Logger(SubscriptionProcessor.name);

    constructor(
        private readonly subscriptionService: SubscriptionService,
        private readonly notificationService: NotificationService,
        @InjectRepository(Subscription)
        private readonly subscriptionRepository: Repository<Subscription>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    /*
    * 1. Thông báo nhắc gia hạn subscription
    */
    @Process('send-renewal-reminder')
    async handleRenewalReminder(job: Job<SubscriptionReminderJobData>): Promise<void> {
        try {
            const { subscriptionId, userId, nextBillingAt } = job.data;

            this.logger.log(`Xử lý thông báo nhắc gia hạn cho subscription ID: ${subscriptionId}`);

            // Verify subscription still exists and is active
            const subscription = await this.subscriptionRepository.findOne({
                where: { id: subscriptionId },
                relations: ['user', 'plan']
            });

            if (!subscription) {
                this.logger.warn(`Subscription ID ${subscriptionId} không tồn tại, bỏ qua thông báo`);
                return;
            }

            if (subscription.status !== SubscriptionStatus.ACTIVE) {
                this.logger.warn(`Subscription ID ${subscriptionId} không còn active, bỏ qua thông báo`);
                return;
            }

            // Verify nextBillingAt hasn't changed significantly (allow 1 hour tolerance)
            const scheduledTime = new Date(nextBillingAt);
            const currentBillingTime = subscription.nextBillingAt;

            if (currentBillingTime) {
                const timeDiff = Math.abs(currentBillingTime.getTime() - scheduledTime.getTime());
                const oneHour = 60 * 60 * 1000;

                if (timeDiff > oneHour) {
                    this.logger.warn(`NextBillingAt đã thay đổi cho subscription ID ${subscriptionId}, bỏ qua thông báo cũ`);
                    return;
                }
            }

            // Get user for notification
            const user = await this.userRepository.findOne({
                where: { id: userId }
            });

            if (!user) {
                this.logger.warn(`User ID ${userId} không tồn tại, bỏ qua thông báo`);
                return;
            }

            // Calculate hours until renewal
            const now = new Date();
            const hoursUntilRenewal = Math.floor((scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60));

            // Send notification
            await this.notificationService.notifySubscriptionRenewalReminder(
                user,
                subscription,
                hoursUntilRenewal
            );

            this.logger.log(`Đã gửi thông báo nhắc gia hạn cho user ${user.fullName} (ID: ${userId})`);

        } catch (error) {
            this.logger.error(`Lỗi khi xử lý thông báo nhắc gia hạn: ${error.message}`, error.stack);
            throw error;
        }
    }

    /*
    * 2. Cleanup subscriptions đã hết hạn
    */
    @Process('cleanup-expired-subscriptions')
    async handleCleanupExpiredSubscriptions(job: Job): Promise<void> {
        try {
            this.logger.log('Bắt đầu cleanup subscriptions đã hết hạn');

            // Find subscriptions that are expired but still active
            const expiredSubscriptions = await this.subscriptionRepository.find({
                where: {
                    status: SubscriptionStatus.ACTIVE,
                },
                relations: ['user', 'plan']
            });

            const now = new Date();
            let cleanedCount = 0;

            for (const subscription of expiredSubscriptions) {
                if (subscription.endDate && subscription.endDate < now) {
                    // Update status to expired
                    subscription.status = SubscriptionStatus.EXPIRED;
                    subscription.nextBillingAt = null;

                    await this.subscriptionRepository.save(subscription);

                    // Send expiry notification
                    if (subscription.user) {
                        await this.notificationService.notifySubscriptionExpired(
                            subscription.user,
                            subscription
                        );
                    }

                    cleanedCount++;
                    this.logger.log(`Đã cleanup subscription ID ${subscription.id}`);
                }
            }

            this.logger.log(`Hoàn thành cleanup ${cleanedCount} subscriptions đã hết hạn`);

        } catch (error) {
            this.logger.error(`Lỗi khi cleanup expired subscriptions: ${error.message}`, error.stack);
            throw error;
        }
    }
} 