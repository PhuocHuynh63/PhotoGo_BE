import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { NotificationService } from './notification.service';

@WebSocketGateway({
    cors: {
        origin: ["http://localhost:3000", "http://localhost:8080", "https://photogo.id.vn"],
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
})
@UseGuards(WsJwtGuard)
export class NotificationSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(NotificationSocketGateway.name);
    private connectedUsers = new Map<string, string>(); // userId -> socketId

    constructor(
        private jwtService: JwtService,
        private notificationService: NotificationService
    ) { }

    afterInit(server: Server) {
        this.logger.log('Notification Socket Gateway initialized');
    }

    async handleConnection(client: Socket) {
        try {
            // Lấy token từ handshake auth hoặc query
            const token = client.handshake.auth.token || client.handshake.query.token;

            if (!token) {
                this.logger.warn('Client connected without token');
                client.disconnect();
                return;
            }

            // Verify JWT token
            const payload = this.jwtService.verify(token as string);
            const userId = payload.sub;

            if (!userId) {
                this.logger.warn('Invalid token payload');
                client.disconnect();
                return;
            }

            // Join user to their personal room
            await client.join(`user_${userId}`);

            // Store user connection
            this.connectedUsers.set(userId, client.id);

            this.logger.log(`User ${userId} connected with socket ${client.id}`);

            // Send welcome message
            client.emit('connected', {
                message: 'Connected to notification service',
                userId: userId,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error(`Connection error: ${error.message}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        // Remove user from connected users
        for (const [userId, socketId] of this.connectedUsers.entries()) {
            if (socketId === client.id) {
                this.connectedUsers.delete(userId);
                this.logger.log(`User ${userId} disconnected`);
                break;
            }
        }
    }

    @SubscribeMessage('join')
    handleJoin(client: Socket, payload: { userId: string }) {
        client.join(`user_${payload.userId}`);
        this.logger.log(`User ${payload.userId} joined notification room`);
    }

    @SubscribeMessage('leave')
    handleLeave(client: Socket, payload: { userId: string }) {
        client.leave(`user_${payload.userId}`);
        this.logger.log(`User ${payload.userId} left notification room`);
    }

    @SubscribeMessage('markAsRead')
    async handleMarkAsRead(client: Socket, payload: { notificationId: string }) {
        // Emit event to mark notification as read
        client.emit('notificationMarkedAsRead', {
            notificationId: payload.notificationId,
            timestamp: new Date().toISOString()
        });
    }

    @SubscribeMessage('getNotifications')
    async handleGetNotifications(client: Socket, payload: {
        userId: string;
        current?: number;
        pageSize?: number;
        type?: string;
        is_read?: boolean;
    }) {
        try {
            // Verify user can only get their own notifications
            const userData = client.data.user;
            if (userData.sub !== payload.userId) {
                client.emit('error', { message: 'Unauthorized access to notifications' });
                return;
            }

            // Convert payload to match DTO format
            const queryParams = {
                current: payload.current?.toString() || '1',
                pageSize: payload.pageSize?.toString() || '10',
                type: payload.type as any, // Convert to NotificationType
                is_read: payload.is_read
            };

            // Get notifications from service
            const result = await this.notificationService.findNotificationsByUser(
                payload.userId,
                queryParams
            );

            client.emit('notificationsList', {
                data: result.data,
                pagination: result.pagination,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            client.emit('error', {
                message: 'Failed to get notifications',
                error: error.message
            });
        }
    }

    @SubscribeMessage('getUnreadCount')
    async handleGetUnreadCount(client: Socket, payload: { userId: string }) {
        try {
            // Verify user can only get their own unread count
            const userData = client.data.user;
            if (userData.sub !== payload.userId) {
                client.emit('error', { message: 'Unauthorized access' });
                return;
            }

            const unreadCount = await this.notificationService.getUnreadCount(payload.userId);

            client.emit('unreadCount', {
                count: unreadCount,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            client.emit('error', {
                message: 'Failed to get unread count',
                error: error.message
            });
        }
    }

    /**
     * Gửi thông báo đến user cụ thể
     */
    sendNotificationToUser(userId: string, notification: any) {
        this.server.to(`user_${userId}`).emit('newNotification', {
            notification,
            timestamp: new Date().toISOString()
        });

        this.logger.log(`Notification sent to user ${userId}`);
    }

    /**
     * Gửi thông báo đến nhiều users
     */
    sendNotificationToUsers(userIds: string[], notification: any) {
        userIds.forEach(userId => {
            this.sendNotificationToUser(userId, notification);
        });
    }

    /**
     * Gửi thông báo broadcast đến tất cả users
     */
    sendBroadcastNotification(notification: any) {
        this.server.emit('broadcastNotification', {
            notification,
            timestamp: new Date().toISOString()
        });

        this.logger.log('Broadcast notification sent to all users');
    }

    /**
     * Gửi thông báo số lượng unread
     */
    sendUnreadCount(userId: string, count: number) {
        this.server.to(`user_${userId}`).emit('unreadCount', {
            count,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Kiểm tra user có online không
     */
    isUserOnline(userId: string): boolean {
        return this.connectedUsers.has(userId);
    }

    /**
     * Lấy danh sách users online
     */
    getOnlineUsers(): string[] {
        return Array.from(this.connectedUsers.keys());
    }
} 