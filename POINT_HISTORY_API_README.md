# API Lịch Sử Thay Đổi Điểm

## Tổng quan

API này cho phép xem lịch sử thay đổi điểm của người dùng với các tính năng phân trang, lọc và thống kê.

## Endpoints

### GET `/points` - Lấy danh sách tất cả điểm

Lấy danh sách tất cả điểm với phân trang và sắp xếp.

#### Query Parameters

| Parameter       | Type   | Required | Description                     | Example                                     |
| --------------- | ------ | -------- | ------------------------------- | ------------------------------------------- |
| `current`       | string | No       | Số trang hiện tại               | `"1"`                                       |
| `pageSize`      | string | No       | Số lượng bản ghi trên mỗi trang | `"10"`                                      |
| `term`          | string | No       | Từ khóa tìm kiếm (email, tên)   | `"nguyen"`                                  |
| `sortBy`        | string | No       | Trường để sắp xếp               | `"balance"`, `"user.email"`, `"created_at"` |
| `sortDirection` | string | No       | Hướng sắp xếp                   | `"asc"`, `"desc"`                           |

#### Sort Options cho `/points`

- `created_at`: Sắp xếp theo thời gian tạo
- `updated_at`: Sắp xếp theo thời gian cập nhật
- `balance`: Sắp xếp theo số điểm hiện tại
- `user.email`: Sắp xếp theo email người dùng
- `user.full_name`: Sắp xếp theo tên người dùng

#### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "balance": 1500,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z",
      "user": {
        "id": "user-uuid",
        "email": "user@example.com",
        "full_name": "Nguyễn Văn A"
      }
    }
  ],
  "pagination": {
    "current": 1,
    "pageSize": 10,
    "totalPage": 5,
    "totalItem": 50
  }
}
```

### GET `/points/history/:userId`

Lấy lịch sử thay đổi điểm của người dùng được chỉ định.

#### Headers

```
Authorization: Bearer <access_token>
```

#### Path Parameters

| Parameter | Type   | Required | Description       | Example  |
| --------- | ------ | -------- | ----------------- | -------- |
| `userId`  | string | Yes      | ID của người dùng | `"uuid"` |

#### Query Parameters

| Parameter       | Type   | Required | Description                     | Example                                    |
| --------------- | ------ | -------- | ------------------------------- | ------------------------------------------ |
| `current`       | string | No       | Số trang hiện tại               | `"1"`                                      |
| `pageSize`      | string | No       | Số lượng bản ghi trên mỗi trang | `"10"`                                     |
| `type`          | string | No       | Loại giao dịch                  | `"kiếm được"`, `"đổi thưởng"`, `"hết hạn"` |
| `sortDirection` | string | No       | Hướng sắp xếp                   | `"asc"`, `"desc"`                          |
| `startDate`     | string | No       | Ngày bắt đầu (ISO 8601)         | `"2024-01-01T00:00:00.000Z"`               |
| `endDate`       | string | No       | Ngày kết thúc (ISO 8601)        | `"2024-12-31T23:59:59.999Z"`               |
| `minAmount`     | string | No       | Số điểm tối thiểu               | `"100"`                                    |
| `maxAmount`     | string | No       | Số điểm tối đa                  | `"1000"`                                   |

#### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "amount": 100,
      "type": "kiếm được",
      "description": "Hoàn thành đơn hàng #123",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "current": 1,
    "pageSize": 10,
    "totalPage": 5,
    "totalItem": 50
  },
  "statistics": {
    "totalEarned": 1500,
    "totalRedeemed": 300,
    "totalExpired": 50,
    "currentBalance": 1150
  }
}
```

#### Response Fields

**data**: Mảng các giao dịch điểm

- `id`: ID của giao dịch
- `amount`: Số điểm thay đổi (dương = cộng, âm = trừ)
- `type`: Loại giao dịch
- `description`: Mô tả giao dịch
- `created_at`: Thời gian tạo giao dịch

**pagination**: Thông tin phân trang

- `current`: Trang hiện tại
- `pageSize`: Số bản ghi trên mỗi trang
- `totalPage`: Tổng số trang
- `totalItem`: Tổng số bản ghi

**statistics**: Thống kê tổng hợp

- `totalEarned`: Tổng điểm đã kiếm được
- `totalRedeemed`: Tổng điểm đã đổi thưởng
- `totalExpired`: Tổng điểm đã hết hạn
- `currentBalance`: Số điểm hiện tại

## Ví dụ sử dụng

### API `/points` - Lấy danh sách điểm

#### 1. Lấy tất cả điểm với phân trang

```bash
GET /points?current=1&pageSize=20
```

#### 2. Tìm kiếm theo email hoặc tên

```bash
GET /points?term=nguyen
```

#### 3. Sắp xếp theo số điểm (cao nhất trước)

```bash
GET /points?sortBy=balance&sortDirection=desc
```

#### 4. Sắp xếp theo email người dùng

```bash
GET /points?sortBy=user.email&sortDirection=asc
```

#### 5. Sắp xếp theo tên người dùng

```bash
GET /points?sortBy=user.full_name&sortDirection=asc
```

#### 6. Kết hợp tìm kiếm và sắp xếp

```bash
GET /points?term=nguyen&sortBy=balance&sortDirection=desc&current=1&pageSize=10
```

### API `/points/history/:userId` - Lấy lịch sử điểm

### 1. Lấy tất cả lịch sử điểm của user

```bash
GET /points/history/123e4567-e89b-12d3-a456-426614174000
```

### 2. Lấy lịch sử với phân trang

```bash
GET /points/history/123e4567-e89b-12d3-a456-426614174000?current=1&pageSize=20
```

### 3. Lọc theo loại giao dịch

```bash
GET /points/history/123e4567-e89b-12d3-a456-426614174000?type=kiếm được
```

### 4. Lọc theo khoảng thời gian

```bash
GET /points/history/123e4567-e89b-12d3-a456-426614174000?startDate=2024-01-01T00:00:00.000Z&endDate=2024-01-31T23:59:59.999Z
```

### 5. Lọc theo khoảng số điểm

```bash
GET /points/history/123e4567-e89b-12d3-a456-426614174000?minAmount=100&maxAmount=1000
```

### 6. Sắp xếp theo thời gian (mới nhất trước)

```bash
GET /points/history/123e4567-e89b-12d3-a456-426614174000?sortDirection=desc
```

### 7. Kết hợp nhiều filter

```bash
GET /points/history/123e4567-e89b-12d3-a456-426614174000?type=kiếm được&startDate=2024-01-01T00:00:00.000Z&minAmount=100&sortDirection=desc&current=1&pageSize=10
```

## Lỗi có thể gặp

### 401 Unauthorized

- Token không hợp lệ hoặc đã hết hạn

### 404 Not Found

- Không tìm thấy thông tin điểm của người dùng
- User ID không tồn tại

### 400 Bad Request

- Tham số query không hợp lệ
- Định dạng ngày tháng không đúng
- User ID không đúng định dạng UUID

## Ghi chú

1. API này yêu cầu xác thực (cần access token)
2. Có thể lấy lịch sử điểm của bất kỳ user nào (admin feature)
3. Nếu user chưa có point record, hệ thống sẽ tự động tạo với balance = 0
4. Thống kê được tính toán dựa trên các filter được áp dụng
5. Số điểm trong `amount` có thể âm (cho các giao dịch trừ điểm)
6. Thống kê `totalRedeemed` và `totalExpired` luôn là số dương (giá trị tuyệt đối)
7. `minAmount` và `maxAmount` filter dựa trên giá trị tuyệt đối của số điểm (|amount|)
