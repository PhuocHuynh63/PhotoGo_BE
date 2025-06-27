# Hệ thống Refund Thủ công - PhotoGo

## Tổng quan

Hệ thống này xử lý các trường hợp thanh toán conflict khi nhiều người cùng thanh toán cho một slot thời gian. Thay vì để tiền bị treo, hệ thống sẽ tạo refund record để admin xử lý thủ công.

## 🔄 Quy trình xử lý

### 1. Khi có conflict payment:
1. **User A** thanh toán thành công → Slot được confirm
2. **User B** thanh toán thành công → PayOS nhận tiền
3. **Webhook User B** đến → Hệ thống phát hiện slot không khả dụng
4. **Tạo refund record** → Lưu thông tin giao dịch chi tiết
5. **Gửi email thông báo** → User B biết tiền sẽ được hoàn lại
6. **Admin nhận thông báo** → Xử lý refund thủ công

### 2. Admin xử lý refund:
1. **Xem danh sách pending refunds**
2. **Xem thông tin giao dịch chi tiết**
3. **Thực hiện refund thủ công** (chuyển tiền)
4. **Mark đã refund** trong hệ thống
5. **Gửi email xác nhận** cho khách hàng

## 📋 API Endpoints

### 1. Lấy danh sách refund đang chờ xử lý (Admin)
```http
GET /refunds/pending
Authorization: Bearer {admin_token}
```

**Response:**
```json
[
  {
    "id": "refund-001",
    "amount": 600000,
    "reason": "Slot thời gian đã được đặt bởi người khác",
    "status": "chờ xử lý",
    "createdAt": "2024-06-27T15:30:00Z",
    "transactionDetails": {
      "bankCode": "VCB",
      "accountNumber": "1234567890",
      "accountName": "NGUYEN VAN A",
      "transferId": "TXN123456",
      "transferTime": "2024-06-27T15:30:00Z",
      "paymentMethod": "BANK_TRANSFER"
    },
    "invoice": {
      "id": "invoice-001",
      "booking": {
        "id": "booking-001",
        "code": "ABC123",
        "fullName": "Nguyễn Văn A",
        "phone": "0901234567",
        "email": "userA@example.com",
        "date": "15/07/2024",
        "time": "14:00"
      }
    }
  }
]
```

### 2. Xử lý refund thủ công (Admin)
```http
POST /refunds/{refundId}/process-manual
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "refundMethod": "BANK_TRANSFER",
  "refundAmount": 600000,
  "refundNote": "Đã chuyển tiền về tài khoản VCB 1234567890",
  "bankAccount": "1234567890",
  "bankName": "Vietcombank"
}
```

**Response:**
```json
{
  "id": "refund-001",
  "status": "đã hoàn thành",
  "manualRefundDetails": {
    "refundMethod": "BANK_TRANSFER",
    "refundAmount": 600000,
    "refundNote": "Đã chuyển tiền về tài khoản VCB 1234567890",
    "refundedAt": "2024-06-27T16:00:00Z",
    "refundedBy": "admin-001",
    "bankAccount": "1234567890",
    "bankName": "Vietcombank"
  }
}
```

### 3. Lấy thông tin refund chi tiết
```http
GET /refunds/{refundId}
Authorization: Bearer {token}
```

## 📧 Email Templates

### 1. Booking Cancellation Email (khi có conflict)
- **Template**: `booking-cancellation.hbs`
- **Nội dung**: Thông báo slot không khả dụng và tiền sẽ được hoàn lại

### 2. Refund Notification Email (khi admin đã refund)
- **Template**: `refund-notification.hbs`
- **Nội dung**: Xác nhận refund đã được xử lý

## 🗄️ Database Schema

### Refund Entity
```sql
CREATE TABLE refund (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL,
  payment_id UUID,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('chờ xử lý', 'đang xử lý', 'đã hoàn thành', 'bị từ chối') DEFAULT 'chờ xử lý',
  transaction_details JSONB,
  manual_refund_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Transaction Details JSON
```json
{
  "bankCode": "VCB",
  "accountNumber": "1234567890",
  "accountName": "NGUYEN VAN A",
  "transferId": "TXN123456",
  "transferTime": "2024-06-27T15:30:00Z",
  "paymentMethod": "BANK_TRANSFER",
  "paymentId": "payos-payment-id"
}
```

### Manual Refund Details JSON
```json
{
  "refundMethod": "BANK_TRANSFER",
  "refundAmount": 600000,
  "refundNote": "Đã chuyển tiền về tài khoản VCB",
  "refundedAt": "2024-06-27T16:00:00Z",
  "refundedBy": "admin-001",
  "bankAccount": "1234567890",
  "bankName": "Vietcombank"
}
```

## 🔧 Cấu hình

### Payment Status Flow
```
PENDING → PAID (success)
PENDING → REFUND_PENDING (conflict)
REFUND_PENDING → REFUNDED (manual refund)
```

### Refund Status Flow
```
PENDING → COMPLETED (manual refund)
```

## 📊 Monitoring & Analytics

### Metrics cần theo dõi:
- Số lượng conflict payments
- Thời gian trung bình xử lý refund
- Tỷ lệ refund thành công
- Số lượng email gửi thành công/thất bại

### Logs quan trọng:
- Payment conflict detection
- Refund record creation
- Manual refund processing
- Email sending

## 🚀 Deployment Checklist

### 1. Database Migration
```sql
-- Thêm các trường mới vào refund table
ALTER TABLE refund ADD COLUMN transaction_details JSONB;
ALTER TABLE refund ADD COLUMN manual_refund_details JSONB;
ALTER TABLE refund ADD COLUMN payment_id UUID;
```

### 2. Environment Variables
```env
# Email configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# PayOS configuration
PAYOS_CLIENT_ID=your-client-id
PAYOS_API_KEY=your-api-key
PAYOS_CHECKSUM_KEY=your-checksum-key
```

### 3. Email Templates
- Đảm bảo templates `booking-cancellation.hbs` và `refund-notification.hbs` đã được tạo

## 🧪 Testing

### Test Case 1: Conflict Payment
1. User A tạo booking và thanh toán thành công
2. User B tạo booking cùng slot và thanh toán thành công
3. Verify: Refund record được tạo với status PENDING
4. Verify: Email thông báo được gửi cho User B

### Test Case 2: Manual Refund
1. Admin xem danh sách pending refunds
2. Admin xử lý refund thủ công
3. Admin mark đã refund
4. Verify: Refund status = COMPLETED
5. Verify: Email xác nhận được gửi cho khách hàng

### Test Case 3: Refund History
1. Kiểm tra refund history được tạo
2. Kiểm tra payment status được cập nhật
3. Kiểm tra manual refund details được lưu

## 🔒 Security Considerations

1. **Admin Access**: Chỉ admin mới có thể xử lý refund
2. **Data Validation**: Validate tất cả input parameters
3. **Audit Trail**: Lưu lịch sử refund đầy đủ
4. **Email Verification**: Verify email trước khi gửi

## 📈 Performance Optimization

1. **Database Indexes**: Index cho `status`, `created_at`, `payment_id`
2. **Caching**: Cache danh sách pending refunds
3. **Batch Processing**: Xử lý email theo batch
4. **Async Processing**: Xử lý refund creation async

## 🎯 Future Enhancements

1. **Dashboard**: Admin dashboard để quản lý refund
2. **Automated Notifications**: SMS/Telegram notifications
3. **Refund Analytics**: Detailed analytics và reporting
4. **Integration**: Tích hợp với hệ thống kế toán
5. **Multi-currency**: Hỗ trợ nhiều loại tiền tệ 