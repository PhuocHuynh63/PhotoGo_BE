import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationSocketGateway } from './notification-socket.gateway';
import { NotificationService } from './notification.service';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { NotificationType } from '../../constants/notification.enum';

@Injectable()
export class NotificationSocketService {
    private readonly logger = new Logger(NotificationSocketService.name);

    constructor(
        private readonly socketGateway: NotificationSocketGateway,
        private readonly notificationService: NotificationService,
        @InjectRepository(Notification)
        private readonly notificationRepository: Repository<Notification>,
    ) { }

    /**
     * Tạo notification và gửi qua socket real-time
     */
    async createAndSendNotification(
        userId: string,
        title: string,
        message: string,
        type: NotificationType = NotificationType.INFO,
        data?: any
    ): Promise<Notification> {
        try {
            // Validation
            if (!userId || !title || !message) {
                throw new Error(`Missing required fields: userId=${userId}, title=${title}, message=${message}`);
            }

            console.log('Creating notification:', { userId, title, message, type, data });

            // Tạo notification trong database
            const notification = this.notificationRepository.create({
                user: { id: userId }, // Sử dụng user object thay vì user_id
                title,
                message,
                type,
                is_read: false,
                data: data ? JSON.stringify(data) : null,
            });

            console.log('Notification object created:', notification);

            const savedNotification = await this.notificationRepository.save(notification);

            console.log('Notification saved:', savedNotification);

            // Gửi qua socket nếu user online
            if (this.socketGateway.isUserOnline(userId)) {
                this.socketGateway.sendNotificationToUser(userId, savedNotification);

                // Cập nhật unread count
                const unreadCount = await this.notificationService.getUnreadCount(userId);
                this.socketGateway.sendUnreadCount(userId, unreadCount);
            }

            return savedNotification;
        } catch (error) {
            this.logger.error(`Error creating and sending notification: ${error.message}`);
            throw error;
        }
    }

    /**
     * Gửi notification đến nhiều users
     */
    async sendNotificationToUsers(
        userIds: string[],
        title: string,
        message: string,
        type: NotificationType = NotificationType.INFO,
        data?: any
    ): Promise<Notification[]> {
        const notifications: Notification[] = [];

        for (const userId of userIds) {
            try {
                const notification = await this.createAndSendNotification(
                    userId,
                    title,
                    message,
                    type,
                    data
                );
                notifications.push(notification);
            } catch (error) {
                this.logger.error(`Error sending notification to user ${userId}: ${error.message}`);
            }
        }

        return notifications;
    }

    /**
     * Gửi broadcast notification đến tất cả users online
     */
    async sendBroadcastNotification(
        title: string,
        message: string,
        type: NotificationType = NotificationType.INFO,
        data?: any
    ): Promise<void> {
        const onlineUsers = this.socketGateway.getOnlineUsers();

        if (onlineUsers.length > 0) {
            await this.sendNotificationToUsers(onlineUsers, title, message, type, data);
        }

        // Gửi broadcast event cho tất cả clients
        this.socketGateway.sendBroadcastNotification({
            title,
            message,
            type,
            data,
            isBroadcast: true,
        });
    }

    /**
     * Gửi notification đăng nhập thành công
     */
    async sendLoginNotification(user: User, deviceInfo?: string, loginMethod?: string): Promise<Notification> {
        const notification = await this.notificationService.notifyLogin(user, deviceInfo, loginMethod);

        if (this.socketGateway.isUserOnline(user.id)) {
            this.socketGateway.sendNotificationToUser(user.id, notification);

            const unreadCount = await this.notificationService.getUnreadCount(user.id);
            this.socketGateway.sendUnreadCount(user.id, unreadCount);
        }

        return notification;
    }

    /**
     * Gửi notification điểm danh thành công
     */
    async sendDailyCheckinNotification(
        user: User,
        pointsEarned: number,
        consecutiveDays: number
    ): Promise<Notification> {
        const notification = await this.notificationService.notifyDailyCheckin(
            user,
            pointsEarned,
            consecutiveDays
        );

        if (this.socketGateway.isUserOnline(user.id)) {
            this.socketGateway.sendNotificationToUser(user.id, notification);

            const unreadCount = await this.notificationService.getUnreadCount(user.id);
            this.socketGateway.sendUnreadCount(user.id, unreadCount);
        }

        return notification;
    }

    /**
     * Gửi notification đổi voucher thành công
     */
    async sendVoucherExchangeNotification(user: User, voucherCode: string): Promise<Notification> {
        const notification = await this.notificationService.notifyVoucherExchange(user, voucherCode);

        if (this.socketGateway.isUserOnline(user.id)) {
            this.socketGateway.sendNotificationToUser(user.id, notification);

            const unreadCount = await this.notificationService.getUnreadCount(user.id);
            this.socketGateway.sendUnreadCount(user.id, unreadCount);
        }

        return notification;
    }

    /**
     * Gửi notification trừ điểm
     */
    async sendPointDeductionNotification(
        user: User,
        pointsDeducted: number,
        reason: string
    ): Promise<Notification> {
        const notification = await this.notificationService.notifyPointDeduction(
            user,
            pointsDeducted,
            reason
        );

        if (this.socketGateway.isUserOnline(user.id)) {
            this.socketGateway.sendNotificationToUser(user.id, notification);

            const unreadCount = await this.notificationService.getUnreadCount(user.id);
            this.socketGateway.sendUnreadCount(user.id, unreadCount);
        }

        return notification;
    }

    /**
     * Gửi notification nhắc gia hạn subscription
     */
    async sendSubscriptionRenewalReminder(
        user: User,
        subscription: any,
        hoursUntilRenewal: number
    ): Promise<Notification> {
        const notification = await this.notificationService.notifySubscriptionRenewalReminder(
            user,
            subscription,
            hoursUntilRenewal
        );

        if (this.socketGateway.isUserOnline(user.id)) {
            this.socketGateway.sendNotificationToUser(user.id, notification);

            const unreadCount = await this.notificationService.getUnreadCount(user.id);
            this.socketGateway.sendUnreadCount(user.id, unreadCount);
        }

        return notification;
    }

    /**
     * Gửi notification subscription hết hạn
     */
    async sendSubscriptionExpiredNotification(user: User, subscription: any): Promise<Notification> {
        const notification = await this.notificationService.notifySubscriptionExpired(user, subscription);

        if (this.socketGateway.isUserOnline(user.id)) {
            this.socketGateway.sendNotificationToUser(user.id, notification);

            const unreadCount = await this.notificationService.getUnreadCount(user.id);
            this.socketGateway.sendUnreadCount(user.id, unreadCount);
        }

        return notification;
    }

    /**
     * Cập nhật unread count cho user
     */
    async updateUnreadCount(userId: string): Promise<void> {
        if (this.socketGateway.isUserOnline(userId)) {
            const unreadCount = await this.notificationService.getUnreadCount(userId);
            this.socketGateway.sendUnreadCount(userId, unreadCount);
        }
    }

    /**
     * Kiểm tra user có online không
     */
    isUserOnline(userId: string): boolean {
        return this.socketGateway.isUserOnline(userId);
    }

    /**
     * Lấy danh sách users online
     */
    getOnlineUsers(): string[] {
        return this.socketGateway.getOnlineUsers();
    }
} 