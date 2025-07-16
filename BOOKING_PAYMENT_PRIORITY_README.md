# Hệ thống Ưu tiên Thanh toán cho Booking - PhotoGo

## Tổng quan

Hệ thống này giải quyết vấn đề khi có nhiều người đặt cùng một slot thời gian. Nguyên tắc "First come, first served" được áp dụng dựa trên thời gian thanh toán, không phải thời gian đặt lịch.

## ⚠️ Vấn đề đã được giải quyết

### Vấn đề cũ:
- Người thứ 2 vẫn có thể thanh toán thành công trên PayOS ngay cả khi slot đã được confirm
- Tiền bị "treo" và cần refund thủ công
- Trải nghiệm người dùng kém

### Giải pháp mới:
- **Pre-payment validation**: Kiểm tra slot availability trước khi tạo PayOS link
- **Real-time slot checking**: API endpoint để kiểm tra slot trước khi thanh toán
- **Automatic rejection**: Từ chối tạo payment link nếu slot không khả dụng

## Cách hoạt động

### 1. Quy trình đặt lịch

1. **Tạo Booking**: Người dùng tạo booking với status `PENDING`
2. **Kiểm tra Slot**: Hệ thống kiểm tra `maxParallelBookings` cho slot thời gian
3. **Pre-payment Validation**: Kiểm tra slot availability trước khi tạo payment link
4. **Tạo Payment Link**: Chỉ tạo link nếu slot còn khả dụng
5. **Timeout**: Booking sẽ tự động hủy sau 15 phút nếu chưa thanh toán

### 2. Quy trình thanh toán

1. **Pre-validation**: Kiểm tra slot availability trước khi tạo PayOS link
2. **Payment Link Creation**: Chỉ tạo link nếu slot còn khả dụng
3. **Payment Processing**: Xử lý thanh toán khi PayOS gửi webhook
4. **Auto-cancel Overlapping**: Tự động hủy các booking `PENDING` khác cùng slot
5. **Thông báo**: Gửi email thông báo hủy cho các booking bị ảnh hưởng

### 3. Các trường hợp xử lý

#### Trường hợp 1: Người thứ nhất thanh toán thành công
- Booking được confirm
- Các booking khác cùng slot bị hủy
- Gửi email thông báo hủy

#### Trường hợp 2: Người thứ hai cố gắng tạo payment link
- **Pre-validation fails**: Không tạo được payment link
- Hiển thị thông báo "Slot không khả dụng"
- Yêu cầu chọn slot khác

#### Trường hợp 3: Booking timeout
- Tự động hủy booking sau 15 phút
- Gửi email thông báo timeout
- Giải phóng slot cho người khác

## API Endpoints

### 1. Kiểm tra slot availability (Booking)
```http
GET /bookings/:id/check-availability
```

**Response:**
```json
{
  "available": true,
  "message": "Slot thời gian vẫn còn khả dụng"
}
```

### 2. Kiểm tra slot availability (Payment)
```http
GET /payments/:invoiceId/check-slot-availability
```

**Response:**
```json
{
  "available": true,
  "message": "Slot thời gian vẫn còn khả dụng"
}
```

### 3. Tạo payment link (với pre-validation)
```http
POST /payments/:invoiceId/payos/link
```

**Response khi slot không khả dụng:**
```json
{
  "statusCode": 400,
  "message": "Slot thời gian không còn khả dụng. Vui lòng chọn slot khác."
}
```

### 4. Xử lý timeout (Admin only)
```http
POST /bookings/admin/handle-timeout
```

**Response:**
```json
{
  "message": "Đã xử lý timeout cho các booking chưa thanh toán",
  "processedCount": 0
}
```

## Cấu hình

### Timeout Settings
- **Booking Timeout**: 15 phút (có thể điều chỉnh trong `handleBookingTimeout()`)
- **Email Templates**: Sử dụng template `booking-cancellation.hbs`

### Database Changes
Không cần thay đổi database schema, chỉ sử dụng các trường hiện có:
- `booking.status`: PENDING → CONFIRMED/CANCELLED
- `booking.created_at`: Để tính timeout

## Email Templates

### Booking Cancellation Email
Template: `src/3rdService/mail/templates/booking-cancellation.hbs`

**Context variables:**
- `fullName`: Tên người dùng
- `bookingCode`: Mã booking
- `bookingDate`: Ngày đặt lịch
- `bookingTime`: Giờ đặt lịch
- `reason`: Lý do hủy
- `supportEmail`: Email hỗ trợ

## Monitoring & Logging

### Logs quan trọng
- Payment processing logs
- Booking cancellation logs
- Email sending logs
- Timeout processing logs
- Pre-payment validation logs

### Metrics cần theo dõi
- Số lượng booking bị hủy do payment priority
- Số lượng payment link bị từ chối do slot unavailability
- Thời gian trung bình từ đặt lịch đến thanh toán
- Tỷ lệ booking timeout
- Số lượng email thông báo gửi thành công/thất bại

## Cron Jobs (Khuyến nghị)

Để tự động xử lý timeout, nên setup cron job:

```typescript
// Chạy mỗi 5 phút
@Cron('0 */5 * * * *')
async handleBookingTimeoutCron() {
  await this.bookingService.handleBookingTimeout();
}
```

## Testing Scenarios

### Test Case 1: Payment Priority
1. User A tạo booking cho slot 14:00-15:00
2. User B tạo booking cho slot 14:00-15:00
3. User A thanh toán thành công
4. User B cố gắng tạo payment link
5. Verify: User B không tạo được payment link, nhận thông báo slot không khả dụng

### Test Case 2: Pre-payment Validation
1. User A confirm booking cho slot 14:00-15:00
2. User B cố gắng tạo payment link cho slot 14:00-15:00
3. Verify: Payment link creation bị từ chối với thông báo slot không khả dụng

### Test Case 3: Timeout
1. User A tạo booking nhưng không thanh toán
2. Chờ 15 phút
3. Chạy handleBookingTimeout()
4. Verify: Booking bị hủy, nhận email timeout

## Troubleshooting

### Vấn đề thường gặp

1. **Email không gửi được**
   - Kiểm tra cấu hình SMTP
   - Kiểm tra template email
   - Xem logs lỗi

2. **Payment không được xử lý**
   - Kiểm tra webhook PayOS
   - Kiểm tra database connection
   - Verify payment status

3. **Booking không bị hủy**
   - Kiểm tra logic overlap detection
   - Verify booking status updates
   - Check database transactions

4. **Pre-payment validation không hoạt động**
   - Kiểm tra circular dependency
   - Verify forwardRef implementation
   - Check booking service injection

### Debug Commands

```bash
# Kiểm tra booking status
curl -X GET "http://localhost:3000/bookings/{bookingId}"

# Kiểm tra slot availability (Booking)
curl -X GET "http://localhost:3000/bookings/{bookingId}/check-availability"

# Kiểm tra slot availability (Payment)
curl -X GET "http://localhost:3000/payments/{invoiceId}/check-slot-availability"

# Tạo payment link
curl -X POST "http://localhost:3000/payments/{invoiceId}/payos/link" \
  -H "Content-Type: application/json" \
  -d '{"type": "DEPOSIT"}'

# Chạy timeout manually (Admin only)
curl -X POST "http://localhost:3000/bookings/admin/handle-timeout" \
  -H "Authorization: Bearer {admin_token}"
```

## Performance Considerations

1. **Database Indexes**: Đảm bảo có index cho:
   - `booking.date`
   - `booking.status`
   - `booking.created_at`

2. **Caching**: Có thể cache slot availability để giảm database queries

3. **Batch Processing**: Xử lý timeout theo batch để tránh overload

4. **Pre-validation Caching**: Cache kết quả pre-validation trong 30 giây

## Security Considerations

1. **Webhook Verification**: Verify PayOS webhook signature
2. **Admin Access**: Chỉ admin mới có thể chạy timeout manually
3. **Email Validation**: Validate email trước khi gửi
4. **Rate Limiting**: Giới hạn số lần check availability
5. **Input Validation**: Validate tất cả input parameters

## Future Enhancements

1. **Real-time Updates**: Sử dụng WebSocket để update slot status real-time
2. **Queue System**: Sử dụng Redis/Bull để xử lý payment queue
3. **Advanced Notifications**: Push notifications, SMS
4. **Analytics Dashboard**: Theo dõi booking patterns và conflicts
5. **Smart Slot Management**: Tự động đề xuất slot thay thế khi slot hiện tại không khả dụng 