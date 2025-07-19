# Socket Notification System Guide

## Tổng quan

Hệ thống socket notification cho phép gửi thông báo real-time đến users thông qua WebSocket. Hệ thống này tích hợp với notification service hiện tại và hỗ trợ:

- Gửi notification đến user cụ thể
- Gửi notification đến nhiều users
- Broadcast notification đến tất cả users online
- Theo dõi trạng thái online/offline của users
- Cập nhật số lượng unread notifications

## Cấu trúc Files

```
src/modules/notifications/
├── notification-socket.gateway.ts    # Socket Gateway xử lý kết nối
├── notification-socket.service.ts    # Service quản lý socket notifications
├── notification-socket.controller.ts # Controller cho socket endpoints
├── notification.service.ts           # Service chính (đã có sẵn)
├── notification.controller.ts        # Controller chính (đã có sẵn)
└── notification.module.ts            # Module (đã cập nhật)
```

## Cách sử dụng

### 1. Kết nối Socket từ Client

```javascript
import { io } from 'socket.io-client';

// Kết nối với token JWT
const socket = io('http://localhost:3000/notifications', {
  auth: {
    token: 'your-jwt-token-here'
  }
});

// Lắng nghe các events
socket.on('connected', (data) => {
  console.log('Connected to notification service:', data);
});

socket.on('newNotification', (data) => {
  console.log('New notification received:', data.notification);
  // Hiển thị notification cho user
});

socket.on('unreadCount', (data) => {
  console.log('Unread count updated:', data.count);
  // Cập nhật badge số lượng unread
});

socket.on('broadcastNotification', (data) => {
  console.log('Broadcast notification:', data.notification);
  // Hiển thị broadcast notification
});

// Join/Leave room
socket.emit('join', { userId: 'user-id' });
socket.emit('leave', { userId: 'user-id' });

// Mark notification as read
socket.emit('markAsRead', { notificationId: 'notification-id' });

// Get user notifications
socket.emit('getNotifications', { 
  userId: 'user-id',
  current: 1,
  pageSize: 10,
  type: 'thông tin'
});

// Get unread count
socket.emit('getUnreadCount', { userId: 'user-id' });

// Listen for notifications list
socket.on('notificationsList', (data) => {
  console.log('Notifications list:', data.data);
  console.log('Pagination:', data.pagination);
});

// Listen for errors
socket.on('error', (data) => {
  console.error('Socket error:', data.message);
});
```

### 2. Sử dụng trong Service

```typescript
// Trong service khác
import { NotificationSocketService } from '../notifications/notification-socket.service';

@Injectable()
export class YourService {
  constructor(
    private readonly notificationSocketService: NotificationSocketService
  ) {}

  async someMethod() {
    // Gửi notification đến user cụ thể
    await this.notificationSocketService.createAndSendNotification(
      'user-id',
      'Tiêu đề thông báo',
      'Nội dung thông báo',
      'INFO'
    );

    // Gửi notification đến nhiều users
    await this.notificationSocketService.sendNotificationToUsers(
      ['user1', 'user2', 'user3'],
      'Tiêu đề thông báo',
      'Nội dung thông báo',
      'SUCCESS'
    );

    // Gửi broadcast notification
    await this.notificationSocketService.sendBroadcastNotification(
      'Thông báo hệ thống',
      'Có cập nhật mới cho ứng dụng',
      'WARNING'
    );
  }
}
```

### 3. API Endpoints

#### Test Socket Notification
```bash
POST /api/v1/notification-socket/test-send/:userId
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Test Notification",
  "message": "This is a test notification",
  "type": "INFO"
}
```

#### Lấy danh sách users online
```bash
GET /api/v1/notification-socket/online-users
Authorization: Bearer <token>
```

#### Gửi broadcast notification
```bash
POST /api/v1/notification-socket/broadcast
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Broadcast Notification",
  "message": "This is a broadcast message",
  "type": "INFO"
}
```

#### Kiểm tra trạng thái user
```bash
GET /api/v1/notification-socket/user-status/:userId
Authorization: Bearer <token>
```

## Notification Types

```typescript
export enum NotificationType {
  INFO = 'thông tin',
  SUCCESS = 'thành công',
  WARNING = 'cảnh báo',
  ERROR = 'lỗi',
  LOGIN = 'đăng nhập'
}
```

## Events

### Client Events (emit)
- `join` - Join notification room
- `leave` - Leave notification room  
- `markAsRead` - Mark notification as read
- `getNotifications` - Lấy danh sách notifications của user
- `getUnreadCount` - Lấy số lượng notifications chưa đọc

### Server Events (on)
- `connected` - Kết nối thành công
- `newNotification` - Notification mới
- `unreadCount` - Cập nhật số unread
- `broadcastNotification` - Broadcast notification
- `notificationMarkedAsRead` - Notification đã được đánh dấu đọc
- `notificationsList` - Danh sách notifications
- `error` - Lỗi từ server

## Tích hợp với Services hiện tại

### 1. Login Service
```typescript
// Trong auth service
await this.notificationSocketService.sendLoginNotification(user, deviceInfo, loginMethod);
```

### 2. Attendance Service  
```typescript
// Trong attendance service
await this.notificationSocketService.sendDailyCheckinNotification(user, pointsEarned, consecutiveDays);
```

### 3. Subscription Service
```typescript
// Trong subscription service
await this.notificationSocketService.sendSubscriptionRenewalReminder(user, subscription, hoursUntilRenewal);
await this.notificationSocketService.sendSubscriptionExpiredNotification(user, subscription);
```

## Security

- Socket connections được bảo vệ bằng JWT authentication
- Users chỉ có thể nhận notifications của chính mình
- Broadcast notifications chỉ dành cho admin
- Tất cả socket events đều được validate

## Performance

- Sử dụng Redis adapter cho horizontal scaling
- Connection pooling để quản lý nhiều connections
- Automatic cleanup cho disconnected users
- Efficient room management

## Monitoring

- Log tất cả socket connections/disconnections
- Track số lượng users online
- Monitor notification delivery success rate
- Alert khi có lỗi socket

## Migration

Chạy migration để thêm field `data` vào bảng notifications:

```sql
ALTER TABLE notifications ADD COLUMN data TEXT;
```

## Troubleshooting

### Lỗi kết nối
- Kiểm tra JWT token có hợp lệ không
- Đảm bảo CORS được cấu hình đúng
- Kiểm tra port và URL socket

### Notification không nhận được
- Kiểm tra user có online không
- Verify user đã join đúng room
- Kiểm tra notification type có hợp lệ không

### Performance issues
- Monitor số lượng connections
- Kiểm tra Redis connection
- Review socket event frequency 