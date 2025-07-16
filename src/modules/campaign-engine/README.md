# Campaign Engine

Hệ thống Campaign Engine cho phép tạo và quản lý các chiến dịch marketing một cách linh hoạt mà không cần code lại cho mỗi chiến dịch mới.

## Tổng quan

Campaign Engine sử dụng kiến trúc Rule-based Engine với các thành phần chính:

- **Trigger**: Sự kiện kích hoạt chiến dịch (user đăng ký, mua hàng, sinh nhật, v.v.)
- **Condition**: Điều kiện để chiến dịch áp dụng (user chưa từng mua hàng, tổng chi tiêu > X, v.v.)
- **Action**: Hành động khi điều kiện thỏa mãn (gửi voucher, cộng điểm, gửi email, v.v.)

## Cấu trúc Database

### Bảng `campaigns`
- Thông tin cơ bản của chiến dịch
- Trạng thái, thời gian bắt đầu/kết thúc
- Giới hạn số lần sử dụng

### Bảng `campaign_triggers`
- Loại sự kiện kích hoạt
- Cấu hình trigger (JSON)

### Bảng `campaign_conditions`
- Loại điều kiện
- Cấu hình điều kiện (JSON)
- Độ ưu tiên

### Bảng `campaign_actions`
- Loại hành động
- Cấu hình hành động (JSON)
- Độ ưu tiên

## Cách sử dụng

### 1. Tích hợp vào hệ thống

```typescript
// Trong app.module.ts
import { CampaignEngineModule } from './modules/campaign-engine/campaign-engine.module';

@Module({
  imports: [
    // ... other modules
    CampaignEngineModule,
  ],
})
export class AppModule {}
```

### 2. Gọi Campaign Engine từ các service khác

```typescript
// Trong user.service.ts
import { CampaignEngineService } from '../campaign-engine/campaign-engine.service';

@Injectable()
export class UserService {
  constructor(
    private campaignEngineService: CampaignEngineService,
  ) {}

  async createUser(userData: any) {
    // Tạo user logic...
    const user = await this.userRepository.save(userData);

    // Trigger campaign event
    await this.campaignEngineService.onUserRegistered(user.id, userData);

    return user;
  }
}
```

### 3. Tạo chiến dịch mới

#### Ví dụ: Chiến dịch chào mừng người mới

```sql
-- 1. Tạo campaign
INSERT INTO campaigns (id, name, description, status, type, isActive) 
VALUES ('uuid-1', 'Chào mừng người mới', 'Tặng voucher cho user mới đăng ký', 'active', 'welcome', true);

-- 2. Tạo trigger
INSERT INTO campaign_triggers (campaignId, triggerType, isActive) 
VALUES ('uuid-1', 'user_registered', true);

-- 3. Tạo condition (user chưa từng mua hàng)
INSERT INTO campaign_conditions (campaignId, conditionType, conditionConfig, priority, isActive) 
VALUES ('uuid-1', 'is_first_purchase', '{}', 1, true);

-- 4. Tạo action (gửi voucher)
INSERT INTO campaign_actions (campaignId, actionType, actionConfig, priority, isActive) 
VALUES ('uuid-1', 'send_voucher', '{"voucherCode": "WELCOME100", "discountAmount": 10, "discountType": "percentage"}', 1, true);
```

### 4. API Endpoints

#### Trigger events
```bash
# User đăng ký
POST /campaign-engine/user-registered
{
  "userId": "user-123",
  "userData": { "email": "user@example.com" }
}

# Mua hàng
POST /campaign-engine/order-completed
{
  "userId": "user-123",
  "orderData": { "orderId": "order-456", "total": 100 }
}

# Sinh nhật
POST /campaign-engine/user-birthday
{
  "userId": "user-123",
  "userData": { "birthday": "1990-01-01" }
}
```

#### Trigger custom event
```bash
POST /campaign-engine/trigger-event
{
  "eventType": "custom_event",
  "userId": "user-123",
  "eventData": { "customField": "value" }
}
```

## Các loại Trigger

- `user_registered`: User đăng ký mới
- `user_birthday`: Sinh nhật user
- `order_completed`: Hoàn thành đơn hàng
- `first_purchase`: Mua hàng lần đầu
- `total_spent`: Tổng chi tiêu
- `holiday_event`: Sự kiện ngày lễ
- `custom_event`: Sự kiện tùy chỉnh

## Các loại Condition

- `is_first_purchase`: User chưa từng mua hàng
- `total_spent_greater_than`: Tổng chi tiêu lớn hơn X
- `user_age_between`: Tuổi user trong khoảng
- `user_registration_date_after`: User đăng ký sau ngày X
- `user_has_not_purchased_in_days`: User không mua hàng trong X ngày
- `user_purchase_count_greater_than`: Số lần mua hàng lớn hơn X
- `custom_condition`: Điều kiện tùy chỉnh

## Các loại Action

- `send_voucher`: Gửi voucher
- `add_points`: Cộng điểm
- `send_email`: Gửi email
- `send_notification`: Gửi thông báo
- `apply_discount`: Áp dụng giảm giá
- `free_shipping`: Miễn phí vận chuyển
- `custom_action`: Hành động tùy chỉnh

## Mở rộng hệ thống

### Thêm Condition mới

1. Thêm vào enum `ConditionType`
2. Implement logic trong `ConditionHandlerService`
3. Cập nhật database schema nếu cần

### Thêm Action mới

1. Thêm vào enum `ActionType`
2. Implement logic trong `ActionHandlerService`
3. Cập nhật database schema nếu cần

### Thêm Trigger mới

1. Thêm vào enum `TriggerType`
2. Thêm method trong `CampaignEngineService`
3. Thêm endpoint trong `CampaignEngineController`

## Ưu điểm

- **Linh hoạt**: Không cần code lại cho mỗi chiến dịch mới
- **Dễ mở rộng**: Dễ dàng thêm condition/action mới
- **Quản lý tập trung**: Tất cả chiến dịch được quản lý qua database
- **Hiệu suất**: Chỉ xử lý các chiến dịch phù hợp với event
- **Bảo trì dễ dàng**: Logic tách biệt, dễ debug và maintain

## Lưu ý

- Cần implement các TODO trong code để tích hợp với các service thực tế
- Nên sử dụng queue system cho các action nặng (gửi email, notification)
- Cần có cơ chế retry cho các action thất bại
- Nên có monitoring và logging để theo dõi hiệu suất 