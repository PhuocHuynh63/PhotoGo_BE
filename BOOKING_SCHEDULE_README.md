# Booking Schedule - Hệ thống đặt lịch 2 loại

## Tổng quan

Hệ thống đã được cập nhật để hỗ trợ 2 loại booking riêng biệt:

1. **Booking 1 ngày**: Hiện slot, logic như cũ
2. **Booking nhiều ngày**: Không hiện slot, đóng ngày luôn khi đặt

## Các thay đổi chính

### 1. Entity mới: BookingSchedule

- **Bảng**: `booking_schedule`
- **Mục đích**: Quản lý từng ngày trong booking nhiều ngày
- **Trạng thái**: 
  - `SCHEDULED` - Đã lên lịch
  - `POSTPONED` - Đã hoãn
  - `COMPLETED` - Đã hoàn thành
  - `CANCELLED` - Đã hủy
  - `CONTINUED` - Đã tiếp tục

### 2. Enum mới: BookingType

```typescript
export enum BookingType {
  SINGLE_DAY = 'một ngày',
  MULTI_DAY = 'nhiều ngày',
}
```

### 3. Cập nhật DTO tạo booking

Giờ có 2 loại booking với validation khác nhau:

#### Booking 1 ngày:
```typescript
{
  "bookingType": "một ngày",
  "date": "04/06/2025",
  "time": "13:00",
  "locationId": "...",
  "sourceType": "DIRECT",
  "depositAmount": 30,
  "fullName": "John Doe",
  "phone": "0909090909",
  "email": "john@example.com"
}
```

#### Booking nhiều ngày:
```typescript
{
  "bookingType": "nhiều ngày",
  "schedules": [
    {
      "date": "04/06/2025",
      "time": "13:00",
      "notes": "Chụp ảnh ngoại cảnh"
    },
    {
      "date": "05/06/2025",
      "time": "14:00",
      "notes": "Chụp ảnh studio"
    }
  ],
  "locationId": "...",
  "sourceType": "DIRECT",
  "depositAmount": 30,
  "fullName": "John Doe",
  "phone": "0909090909",
  "email": "john@example.com"
}
```

## Logic hoạt động

### 1. Booking 1 ngày (SINGLE_DAY)

- **Hiển thị slot**: Có hiển thị slot thời gian
- **Validation**: Kiểm tra slot availability, lock slot
- **Timeout**: Có timeout 15 phút, unlock slot nếu không thanh toán
- **Logic**: Giống như cũ

### 2. Booking nhiều ngày (MULTI_DAY)

- **Hiển thị slot**: Không hiển thị slot, chỉ chọn ngày
- **Validation**: Chỉ kiểm tra ngày có làm việc không
- **Đóng ngày**: Khi đặt booking, toàn bộ ngày đó sẽ bị đóng
- **Timeout**: Không có timeout vì không lock slot
- **Hoãn**: Ngày vẫn đóng, vendor quyết định có mở lại hay không

## API Endpoints

### Booking Schedule Controller

- `POST /booking-schedules/:bookingId` - Tạo lịch booking mới
- `POST /booking-schedules/:bookingId/multiple` - Tạo nhiều lịch booking cùng lúc
- `GET /booking-schedules/booking/:bookingId` - Lấy tất cả lịch booking theo booking ID
- `GET /booking-schedules/booking/:bookingId/summary` - Lấy tổng quan lịch booking
- `GET /booking-schedules/:id` - Lấy thông tin lịch booking theo ID
- `PUT /booking-schedules/:id` - Cập nhật lịch booking
- `PUT /booking-schedules/:id/postpone` - Hoãn lịch booking
- `PUT /booking-schedules/:id/continue` - Tiếp tục lịch booking đã hoãn
- `PUT /booking-schedules/:id/complete` - Hoàn thành lịch booking
- `PUT /booking-schedules/:id/cancel` - Hủy lịch booking
- `DELETE /booking-schedules/:id` - Xóa lịch booking

### Booking Controller (cập nhật)

- `GET /bookings/:id/with-schedules` - Lấy booking với tất cả lịch trình

## Luồng hoạt động

### 1. Tạo booking 1 ngày

1. Client gửi request với `bookingType: "một ngày"`
2. Hệ thống validate slot availability
3. Lock slot thời gian
4. Tạo booking với `bookingType: SINGLE_DAY`
5. Set timeout 15 phút
6. Trả về payment link

### 2. Tạo booking nhiều ngày

1. Client gửi request với `bookingType: "nhiều ngày"`
2. Hệ thống validate tất cả ngày trong schedules
3. Không lock slot (đóng toàn bộ ngày)
4. Tạo booking với `bookingType: MULTI_DAY`
5. Tạo booking schedules cho tất cả ngày
6. Không set timeout
7. Trả về payment link

### 3. Hoãn lịch (chỉ áp dụng cho booking nhiều ngày)

1. Gọi `PUT /booking-schedules/:id/postpone`
2. Cung cấp lý do hoãn và ngày giờ mới
3. Status chuyển thành `POSTPONED`
4. **Ngày vẫn đóng**, vendor quyết định có mở lại hay không

### 4. Tiếp tục lịch đã hoãn

1. Gọi `PUT /booking-schedules/:id/continue`
2. Status chuyển thành `CONTINUED`
3. Ngày giờ được cập nhật theo `postponed_to_date` và `postponed_to_time`

## Ví dụ sử dụng

### Tạo booking 1 ngày

```bash
POST /bookings?userId=123&serviceConceptId=456
{
  "bookingType": "một ngày",
  "date": "04/06/2025",
  "time": "13:00",
  "locationId": "789",
  "sourceType": "DIRECT",
  "depositAmount": 30,
  "fullName": "John Doe",
  "phone": "0909090909",
  "email": "john@example.com"
}
```

### Tạo booking nhiều ngày

```bash
POST /bookings?userId=123&serviceConceptId=456
{
  "bookingType": "nhiều ngày",
  "schedules": [
    {
      "date": "04/06/2025",
      "time": "13:00",
      "notes": "Chụp ảnh ngoại cảnh"
    },
    {
      "date": "05/06/2025",
      "time": "14:00",
      "notes": "Chụp ảnh studio"
    }
  ],
  "locationId": "789",
  "sourceType": "DIRECT",
  "depositAmount": 30,
  "fullName": "John Doe",
  "phone": "0909090909",
  "email": "john@example.com"
}
```

### Hoãn lịch

```bash
PUT /booking-schedules/abc-123/postpone
{
  "postponeReason": "Thời tiết xấu",
  "postponedToDate": "06/06/2025",
  "postponedToTime": "15:00",
  "notes": "Hoãn do mưa"
}
```

### Tiếp tục lịch

```bash
PUT /booking-schedules/abc-123/continue
{
  "notes": "Tiếp tục theo lịch mới"
}
```

### Lấy booking với schedules

```bash
GET /bookings/booking-123/with-schedules
```

Response:
```json
{
  "booking": {
    "id": "booking-123",
    "date": "2025-06-04",
    "time": "13:00",
    "status": "PENDING",
    "bookingType": "nhiều ngày",
    // ... other booking fields
  },
  "schedules": [
    {
      "id": "schedule-1",
      "bookingId": "booking-123",
      "date": "2025-06-04",
      "time": "13:00",
      "status": "SCHEDULED",
      "notes": "Chụp ảnh ngoại cảnh"
    },
    {
      "id": "schedule-2", 
      "bookingId": "booking-123",
      "date": "2025-06-05",
      "time": "14:00",
      "status": "SCHEDULED",
      "notes": "Chụp ảnh studio"
    }
  ]
}
```

## Migration

Chạy migration để tạo bảng mới và cập nhật bảng cũ:

```bash
npm run migration:run
```

## Lưu ý quan trọng

### Booking 1 ngày:
1. **Hiển thị slot**: Có hiển thị slot thời gian
2. **Validation**: Kiểm tra slot availability, lock slot
3. **Timeout**: Có timeout 15 phút, unlock slot nếu không thanh toán
4. **Logic**: Giống như cũ

### Booking nhiều ngày:
1. **Hiển thị slot**: Không hiển thị slot, chỉ chọn ngày
2. **Validation**: Chỉ kiểm tra ngày có làm việc không
3. **Đóng ngày**: Khi đặt booking, toàn bộ ngày đó sẽ bị đóng
4. **Timeout**: Không có timeout vì không lock slot
5. **Hoãn**: Ngày vẫn đóng, vendor quyết định có mở lại hay không

## Các tính năng nâng cao

- **Summary**: Xem tổng quan tình trạng các ngày booking
- **Individual management**: Quản lý từng ngày riêng biệt
- **Postpone/Continue**: Hoãn và tiếp tục linh hoạt
- **Notes**: Ghi chú cho từng ngày
- **Vendor control**: Vendor có quyền quyết định mở/đóng ngày sau khi hoãn 