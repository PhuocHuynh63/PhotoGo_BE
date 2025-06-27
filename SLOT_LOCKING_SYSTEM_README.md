# Hệ thống Slot Locking - PhotoGo

## Tổng quan

Hệ thống Slot Locking được thiết kế để ngăn chặn conflict khi nhiều người cùng đặt booking cho cùng một slot thời gian. Khi người dùng bắt đầu quá trình booking, slot sẽ được "khóa" tạm thời để người khác không thể đặt cùng lúc.

## 🔄 Quy trình hoạt động

### 1. Khi User 1 bắt đầu booking:
1. **User 1** nhập thông tin booking
2. **Hệ thống kiểm tra** slot có available không
3. **Lock slot** → Giảm `maxParallelBookings` xuống bằng `alreadyBooked`
4. **Tạo PayOS link** → User 1 có thể thanh toán
5. **Set timeout 15 phút** → Nếu không thanh toán sẽ unlock slot

### 2. Khi User 2 cố gắng booking cùng slot:
1. **User 2** nhập thông tin booking
2. **Hệ thống kiểm tra** slot availability
3. **Slot đã bị lock** → Trả về lỗi "Slot đã được đặt bởi người khác"
4. **Không tạo PayOS link** → User 2 không thể thanh toán

### 3. Khi User 1 thanh toán thành công:
1. **PayOS webhook** → Payment status = COMPLETED
2. **Unlock slot** → Restore `maxParallelBookings` = 1
3. **Booking confirmed** → Status = CONFIRMED

### 4. Khi User 1 không thanh toán (timeout):
1. **15 phút timeout** → Check booking status
2. **Booking vẫn PENDING** → Unlock slot
3. **Cancel booking** → Status = CANCELLED
4. **Gửi email thông báo** → User 1 biết booking bị hủy

## 📋 API Endpoints

### 1. Kiểm tra slot availability
```http
GET /bookings/check-slot-availability?date=15/07/2024&time=14:00&locationId=location-001
```

**Response:**
```json
{
  "isAvailable": true,
  "message": "Slot có sẵn"
}
```

### 2. Tạo booking (với slot locking)
```http
POST /bookings
Content-Type: application/json

{
  "date": "15/07/2024",
  "time": "14:00",
  "locationId": "location-001",
  "fullName": "Nguyễn Văn A",
  "phone": "0901234567",
  "email": "user@example.com",
  "depositAmount": 50
}
```

**Response:**
```json
{
  "booking": {
    "id": "booking-001",
    "code": "ABC123",
    "status": "chờ thanh toán",
    "date": "15/07/2024",
    "time": "14:00"
  },
  "paymentLink": "https://payos.vn/checkout/...",
  "code": "ABC123"
}
```

### 3. Xử lý timeout (Admin)
```http
POST /bookings/admin/handle-timeout
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "message": "Đã hủy 3 booking hết hạn",
  "cancelledCount": 3
}
```

## 🗄️ Database Schema

### LocationSlotTimeWorkingDate Entity
```sql
CREATE TABLE location_slot_time_working_date (
  id UUID PRIMARY KEY,
  slot_time_id UUID NOT NULL,
  working_date_id UUID NOT NULL,
  max_parallel_bookings INTEGER DEFAULT 1,
  already_booked INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Slot Locking Logic
```typescript
// Lock slot: Giảm maxParallelBookings xuống bằng alreadyBooked
slotTimeWorkingDate.maxParallelBookings = slotTimeWorkingDate.alreadyBooked;

// Unlock slot: Restore maxParallelBookings về 1
slotTimeWorkingDate.maxParallelBookings = 1;
```

## 🔧 Cấu hình

### Timeout Settings
```typescript
const TIMEOUT_MINUTES = 15; // 15 phút timeout cho booking chưa thanh toán
```

### Slot Availability Check
```typescript
// Kiểm tra slot có available không
const isAvailable = slotTimeWorkingDate.alreadyBooked < slotTimeWorkingDate.maxParallelBookings;
```

## 📊 Monitoring & Analytics

### Metrics cần theo dõi:
- Số lượng slot bị lock
- Số lượng booking timeout
- Thời gian trung bình từ lock đến unlock
- Tỷ lệ booking thành công sau khi lock

### Logs quan trọng:
- Slot locking events
- Slot unlocking events
- Booking timeout events
- Payment success events

## 🚀 Deployment Checklist

### 1. Database Migration
```sql
-- Đảm bảo bảng location_slot_time_working_date có đủ columns
ALTER TABLE location_slot_time_working_date 
ADD COLUMN IF NOT EXISTS max_parallel_bookings INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS already_booked INTEGER DEFAULT 0;
```

### 2. Environment Variables
```env
# Timeout configuration
BOOKING_TIMEOUT_MINUTES=15

# Logging configuration
LOG_LEVEL=info
```

### 3. Cron Job Setup
```bash
# Chạy timeout handler mỗi 5 phút
*/5 * * * * curl -X POST "http://localhost:3000/bookings/admin/handle-timeout" \
  -H "Authorization: Bearer {admin_token}"
```

## 🧪 Testing

### Test Case 1: Slot Locking
1. User A tạo booking → Slot bị lock
2. User B cố gắng booking cùng slot → Báo lỗi
3. Verify: User B không thể tạo PayOS link

### Test Case 2: Payment Success
1. User A tạo booking → Slot bị lock
2. User A thanh toán thành công → Slot được unlock
3. User B có thể booking slot đó → Thành công

### Test Case 3: Payment Timeout
1. User A tạo booking → Slot bị lock
2. User A không thanh toán trong 15 phút → Slot được unlock
3. User B có thể booking slot đó → Thành công

### Test Case 4: Concurrent Booking
1. User A và User B cùng lúc tạo booking
2. User A thành công → Slot bị lock
3. User B thất bại → Báo lỗi slot không available

## 🔒 Security Considerations

1. **Race Condition Protection**: Slot locking ngăn chặn race condition
2. **Timeout Protection**: Tự động unlock slot sau timeout
3. **Data Consistency**: Đảm bảo slot status nhất quán
4. **Error Handling**: Xử lý lỗi khi lock/unlock slot

## 📈 Performance Optimization

1. **Database Indexes**: Index cho `slot_time_id`, `working_date_id`
2. **Caching**: Cache slot availability status
3. **Async Processing**: Xử lý timeout async
4. **Connection Pooling**: Tối ưu database connections

## 🎯 Future Enhancements

1. **Dynamic Timeout**: Timeout có thể thay đổi theo slot
2. **Priority Queue**: Ưu tiên booking theo thứ tự
3. **Real-time Updates**: WebSocket để update slot status real-time
4. **Advanced Locking**: Lock theo duration thay vì slot time
5. **Analytics Dashboard**: Dashboard để monitor slot usage

## 🔄 Integration với Payment System

### PayOS Webhook Integration
```typescript
// Khi payment thành công
if (payment.status === 'COMPLETED') {
  // Unlock slot
  await locationAvailabilityService.unlockSlot(date, time, locationId);
  
  // Confirm booking
  booking.status = BookingStatus.CONFIRMED;
}
```

### Refund System Integration
```typescript
// Khi có conflict payment
if (!isSlotAvailable) {
  // Tạo refund record
  await refundService.createConflictRefund(paymentId, transactionDetails);
  
  // Unlock slot
  await locationAvailabilityService.unlockSlot(date, time, locationId);
}
```

## 📝 Error Messages

### Common Error Messages
- `"Slot thời gian này đã được đặt bởi người khác. Vui lòng chọn thời gian khác."`
- `"Không thể khóa slot thời gian. Vui lòng thử lại sau."`
- `"Slot đã được đặt bởi người khác"`

### Success Messages
- `"Slot có sẵn"`
- `"Booking tạo thành công"`
- `"Slot đã được unlock"` 