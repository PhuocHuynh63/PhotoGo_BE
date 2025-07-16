# Hệ thống Thông báo Nhắc gia hạn Subscription

## 📋 Tổng quan

Hệ thống sử dụng **Bull Queue** với **Redis** để tự động gửi thông báo nhắc gia hạn subscription khi còn **24 giờ** trước `nextBillingAt`.

## 🚀 Tính năng chính

### 1. **Thông báo Tự động**
- Gửi thông báo 24h trước ngày gia hạn
- Tự động schedule khi tạo/cập nhật subscription
- Tự động cancel reminder khi subscription bị hủy

### 2. **Bull Queue Jobs**
- **send-renewal-reminder**: Gửi thông báo nhắc gia hạn
- **cleanup-expired-subscriptions**: Dọn dẹp subscription hết hạn

### 3. **Notification Types**
- **Renewal Reminder**: Nhắc gia hạn trước 24h
- **Subscription Expired**: Thông báo hết hạn

## 🏗️ Kiến trúc

```
SubscriptionService
├── scheduleRenewalReminder() ← Tự động khi create/update
├── cancelRenewalReminder() ← Tự động khi cancel/delete
└── schedulePeriodicCleanup() ← Admin trigger

SubscriptionProcessor (Bull Queue)
├── @Process('send-renewal-reminder')
└── @Process('cleanup-expired-subscriptions')

NotificationService
├── notifySubscriptionRenewalReminder()
└── notifySubscriptionExpired()
```

## 📝 Workflow

### **Tạo Subscription với Reminder**
```typescript
1. User tạo subscription với nextBillingAt
2. SubscriptionService.create() 
3. → Tự động gọi scheduleRenewalReminder()
4. → Bull queue schedule job với delay = nextBillingAt - 24h
5. → Job được lưu trong Redis
```

### **Khi đến thời gian nhắc**
```typescript
1. Bull queue execute job 'send-renewal-reminder'
2. SubscriptionProcessor.handleRenewalReminder()
3. → Verify subscription vẫn active và nextBillingAt chưa đổi
4. → NotificationService.notifySubscriptionRenewalReminder()
5. → Lưu notification vào database
```

### **Khi thanh toán thành công**
```typescript
1. SubscriptionPaymentService.handlePayOSCallback()
2. → Update nextBillingAt cho chu kỳ tiếp theo
3. → scheduleRenewalReminderForSubscription()
4. → Schedule reminder mới cho chu kỳ tiếp theo
```

## 🔧 Setup & Configuration

### **1. Environment Variables**
```env
REDIS_URI=redis://password@host:port
```

### **2. Module Dependencies**
```typescript
// subscription.module.ts
imports: [
  BullQueueModule.registerQueue('subscription-reminders'),
  BullQueueModule.forRoot(),
  NotificationModule,
]
```

### **3. Dependencies**
```json
{
  "@nestjs/bull": "^11.0.2",
  "bull": "^4.16.5",
  "ioredis": "^5.6.1"
}
```

## 🧪 Testing & Usage

### **1. Test Endpoints**

#### **Tạo Subscription với Auto Reminder**
```bash
POST /api/v1/subscriptions/admin/test-create-with-reminder
Content-Type: application/json

{
  "userId": "user-uuid",
  "planId": "plan-uuid", 
  "hoursFromNow": 25  // Reminder sẽ trigger sau 1 giờ (25-24=1)
}
```

#### **Test Manual Reminder**
```bash
POST /api/v1/subscriptions/admin/test-renewal-reminder/{subscriptionId}
```

#### **Trigger Cleanup Job**
```bash
POST /api/v1/subscriptions/admin/cleanup-expired
```

### **2. Kiểm tra Job Status**

#### **Redis CLI**
```bash
# Xem tất cả keys của Bull
redis-cli KEYS "bull:subscription-reminders:*"

# Xem delayed jobs
redis-cli ZRANGE "bull:subscription-reminders:delayed" 0 -1 WITHSCORES
```

#### **Database**
```sql
-- Kiểm tra notifications đã tạo
SELECT * FROM notifications 
WHERE type = 'INFO' AND title = 'Nhắc nhở gia hạn đăng ký'
ORDER BY created_at DESC;

-- Kiểm tra subscription active
SELECT id, user_id, next_billing_at, status 
FROM subscription 
WHERE status = 'ACTIVE' AND next_billing_at IS NOT NULL;
```

## 📋 Các trường hợp sử dụng

### **1. Subscription thông thường**
```typescript
// Tạo subscription với nextBillingAt
const subscription = await subscriptionService.create({
  userId: 'user-id',
  planId: 'plan-id',
  startDate: '2024-01-01',
  billingCycle: BillingCycle.MONTHLY,
  nextBilledAt: '2024-02-01T00:00:00Z' // Tự động schedule reminder
});
```

### **2. Cập nhật nextBillingAt**
```typescript
// Update sẽ tự động cancel reminder cũ và tạo mới
await subscriptionService.update('subscription-id', {
  nextBilledAt: '2024-02-15T00:00:00Z'
});
```

### **3. Hủy subscription**
```typescript
// Cancel sẽ tự động cancel reminder
await subscriptionService.cancel('subscription-id');
```

## 🔍 Monitoring & Troubleshooting

### **Debug Logs**
```bash
# Xem logs của SubscriptionService
grep "SubscriptionService" logs/app.log | grep "reminder"

# Xem logs của SubscriptionProcessor  
grep "SubscriptionProcessor" logs/app.log

# Xem logs của NotificationService
grep "notifySubscriptionRenewalReminder" logs/app.log
```

### **Common Issues**

#### **1. Job không execute**
- ✅ Kiểm tra Redis connection
- ✅ Verify `nextBillingAt > now + 24h`
- ✅ Confirm `userId` tồn tại

#### **2. Duplicate notifications**
- ✅ Kiểm tra logic `cancelRenewalReminder()` 
- ✅ Verify job uniqueness

#### **3. Notification không hiển thị**
- ✅ Kiểm tra `notification.is_read = false`
- ✅ Verify user ID mapping

## 🎯 Production Considerations

### **1. Performance**
```typescript
// Job options for production
{
  delay: calculatedDelay,
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: true,  // Cleanup completed jobs
  removeOnFail: false,     // Keep failed jobs for debugging
}
```

### **2. Monitoring**
- Bull Board UI cho monitoring jobs
- Alerting cho failed jobs
- Metrics cho job execution time

### **3. Scaling**
- Redis cluster cho high availability
- Multiple worker instances
- Job concurrency limits

## 🚀 Future Enhancements

1. **Multiple Reminder Times**: 24h, 1h, 15min trước gia hạn
2. **Email/SMS Integration**: Gửi qua nhiều kênh
3. **Smart Scheduling**: Dựa trên timezone của user
4. **A/B Testing**: Test hiệu quả các loại thông báo
5. **Analytics**: Tracking tỷ lệ gia hạn sau reminder

## 📞 API Endpoints

### **Production Endpoints**
```typescript
POST /subscriptions                    // Tự động schedule reminder
PUT  /subscriptions/:id               // Tự động reschedule
POST /subscriptions/:id/cancel        // Tự động cancel reminder
```

### **Admin/Test Endpoints**
```typescript
POST /subscriptions/admin/test-renewal-reminder/:id
POST /subscriptions/admin/test-create-with-reminder  
POST /subscriptions/admin/cleanup-expired
POST /subscriptions/admin/setup-periodic-cleanup
```

---

> **Lưu ý**: Hệ thống này yêu cầu Redis server running và environment variable `REDIS_URI` được cấu hình đúng. 