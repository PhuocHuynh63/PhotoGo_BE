import { Controller, Post, Get, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';
import { NotificationSocketService } from './notification-socket.service';
import { Public } from 'src/decorator/custom';
import { NotificationType } from 'src/constants/notification.enum';
import { TestNotificationDto } from './dto/test-notification.dto';
import { NotificationService } from './notification.service';

@ApiTags('Notification Socket')
@Controller('notification-socket')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
export class NotificationSocketController {
    constructor(
        private readonly notificationSocketService: NotificationSocketService,
        private readonly notificationService: NotificationService
    ) { }

    @Post('test-send/:userId')
    @Public()
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Test gửi notification qua socket' })
    @ApiResponse({ status: 200, description: 'Notification sent successfully' })
    async testSocketNotification(
        @Param('userId') userId: string,
        @Body() body: TestNotificationDto
    ) {
        console.log('Received body:', body);
        console.log('Body type:', typeof body);
        console.log('Body keys:', Object.keys(body));

        const { title, message, type = NotificationType.INFO } = body;

        console.log('Extracted values:', { title, message, type });

        // Validation
        if (!title || !message) {
            throw new Error(`Title and message are required. Received: title="${title}", message="${message}"`);
        }

        console.log('Creating notification with:', { userId, title, message, type });

        const notification = await this.notificationSocketService.createAndSendNotification(
            userId,
            title,
            message,
            type
        );

        return {
            success: true,
            message: 'Notification sent via socket',
            notification,
            userOnline: this.notificationSocketService.isUserOnline(userId)
        };
    }

    @Get('online-users')
    @ApiOperation({ summary: 'Lấy danh sách users online' })
    @ApiResponse({ status: 200, description: 'Online users list' })
    async getOnlineUsers() {
        const onlineUsers = this.notificationSocketService.getOnlineUsers();

        return {
            onlineUsers,
            count: onlineUsers.length
        };
    }

    @Post('broadcast')
    @ApiOperation({ summary: 'Gửi broadcast notification' })
    @ApiResponse({ status: 200, description: 'Broadcast sent successfully' })
    async sendBroadcastNotification(
        @Body() body: { title: string; message: string; type?: string }
    ) {
        const { title, message, type = 'INFO' } = body;

        await this.notificationSocketService.sendBroadcastNotification(
            title,
            message,
            type as any
        );

        return {
            success: true,
            message: 'Broadcast notification sent',
            onlineUsersCount: this.notificationSocketService.getOnlineUsers().length
        };
    }

    @Get('user-status/:userId')
    @ApiOperation({ summary: 'Kiểm tra trạng thái online của user' })
    @ApiResponse({ status: 200, description: 'User online status' })
    async getUserStatus(@Param('userId') userId: string) {
        const isOnline = this.notificationSocketService.isUserOnline(userId);

        return {
            userId,
            isOnline,
            timestamp: new Date().toISOString()
        };
    }

    @Get('test-notifications/:userId')
    @ApiOperation({ summary: 'Test lấy notifications qua socket' })
    @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
    async testGetNotifications(
        @Param('userId') userId: string,
        @Query() query: { current?: string; pageSize?: string; type?: string }
    ) {
        const notifications = await this.notificationService.findNotificationsByUser(userId, {
            current: query.current || '1',
            pageSize: query.pageSize || '10',
            type: query.type as any
        });

        return {
            success: true,
            message: 'Notifications retrieved',
            data: notifications.data,
            pagination: notifications.pagination,
            userOnline: this.notificationSocketService.isUserOnline(userId)
        };
    }
} 