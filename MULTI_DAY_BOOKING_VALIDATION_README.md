# Multi-Day Booking Validation Logic

## Tổng quan

Hệ thống booking đã được cập nhật để hỗ trợ validation cho multi-day booking, đảm bảo không có xung đột với các booking đã thanh toán thành công.

## Logic Validation

### 1. Kiểm tra trước khi tạo booking

#### Single Day Booking (Logic cũ)
- Kiểm tra slot availability
- Lock slot trong quá trình thanh toán
- Timeout sau 15 phút nếu không thanh toán

#### Multi-Day Booking (Logic mới)
- **Không lock slot** - toàn bộ ngày sẽ bị đóng ngay khi tạo booking
- Kiểm tra xem các ngày đã được đặt và thanh toán thành công chưa
- Nếu có xung đột → từ chối tạo booking

### 2. Validation Flow

```typescript
// 1. Kiểm tra overall availability cho tất cả ngày
const availabilityCheck = await this.checkMultiDayAvailability(
  schedules,
  locationId,
  serviceConcept
);

if (!availabilityCheck.isAvailable) {
  throw new BadRequestException(availabilityCheck.reason);
}

// 2. Validate từng schedule riêng lẻ
for (const schedule of schedules) {
  await this.validateMultiDaySchedule(schedule, serviceConcept, locationId);
}
```

### 3. Kiểm tra xung đột với booking đã thanh toán

```typescript
private async isDateAlreadyBookedAndPaid(
  date: string,
  time: string,
  locationId: string,
  duration: number
): Promise<boolean> {
  // Tìm tất cả booking đã thanh toán cho ngày và location này
  const paidBookings = await this.bookingRepository.find({
    where: {
      date: new Date(convertedDate),
      locationId: locationId,
      status: BookingStatus.PAID
    },
    relations: ['serviceConcept']
  });

  // Kiểm tra overlap thời gian
  // Nếu có overlap → return true (đã được đặt)
}
```

## Xử lý thanh toán

### 1. Thanh toán thành công

#### Single Day Booking
- Lock slot cho booking này
- Giữ nguyên logic cũ

#### Multi-Day Booking
- **Đóng toàn bộ các ngày** trong schedule
- Cập nhật `location_workingdate.isAvailable = false`

```typescript
// Trong payment.service.ts
if (payment.type === PaymentType.DEPOSIT && booking.schedules && booking.schedules.length > 0) {
  await this.closeAllScheduledDates(booking.schedules, booking.locationId);
}
```

### 2. Thanh toán thất bại

#### Single Day Booking
- Unlock slot
- Giữ nguyên logic cũ

#### Multi-Day Booking
- **Mở lại toàn bộ các ngày** trong schedule
- Cập nhật `location_workingdate.isAvailable = true`

```typescript
// Trong payment.service.ts
if (booking.schedules && booking.schedules.length > 0) {
  await this.reopenAllScheduledDates(booking.schedules, booking.locationId);
}
```

## Các method chính

### 1. `checkMultiDayAvailability`
Kiểm tra tính khả dụng của tất cả ngày trong multi-day booking

```typescript
async checkMultiDayAvailability(
  schedules: any[], 
  locationId: string, 
  serviceConcept?: ServiceConcept
): Promise<{
  isAvailable: boolean;
  unavailableDates: string[];
  reason?: string;
}>
```

### 2. `isDateAlreadyBookedAndPaid`
Kiểm tra xem một ngày cụ thể đã được đặt và thanh toán chưa

```typescript
private async isDateAlreadyBookedAndPaid(
  date: string,
  time: string,
  locationId: string,
  duration: number
): Promise<boolean>
```

### 3. `closeAllScheduledDates`
Đóng tất cả ngày khi thanh toán thành công

```typescript
private async closeAllScheduledDates(
  schedules: any[], 
  locationId: string
): Promise<void>
```

### 4. `reopenAllScheduledDates`
Mở lại tất cả ngày khi thanh toán thất bại hoặc booking bị hủy

```typescript
private async reopenAllScheduledDates(
  schedules: any[], 
  locationId: string
): Promise<void>
```

## Ví dụ sử dụng

### Scenario 1: Người A đặt ngày 13, 14, 15
- Người A tạo booking cho 3 ngày
- Hệ thống kiểm tra: cả 3 ngày đều available
- Booking được tạo thành công
- Khi thanh toán thành công → 3 ngày bị đóng

### Scenario 2: Người B muốn đặt ngày 14 (đã có người A)
- Người B tạo booking cho ngày 14
- Hệ thống kiểm tra: ngày 14 đã được đặt và thanh toán
- **Từ chối tạo booking** với thông báo lỗi

### Scenario 3: Người A hủy booking
- Người A hủy booking
- Hệ thống mở lại 3 ngày (13, 14, 15)
- Người khác có thể đặt lại các ngày này

## Lưu ý quan trọng

1. **Multi-day booking không có timeout** - toàn bộ ngày bị đóng ngay khi tạo
2. **Chỉ kiểm tra booking đã thanh toán** - booking pending không ảnh hưởng
3. **Kiểm tra overlap thời gian** - không chỉ kiểm tra ngày mà còn kiểm tra giờ
4. **Tự động mở lại ngày** khi booking bị hủy hoặc thanh toán thất bại

## Database Changes

### Bảng `location_workingdate`
- `isAvailable`: boolean - kiểm soát việc đóng/mở ngày
- Được cập nhật khi thanh toán thành công/thất bại

### Bảng `booking_schedule`
- Lưu trữ các ngày trong multi-day booking
- Được sử dụng để xác định ngày nào cần đóng/mở

## API Endpoints

### Kiểm tra availability
```typescript
// Có thể thêm endpoint để kiểm tra availability trước khi tạo booking
POST /bookings/check-multi-day-availability
{
  "schedules": [
    { "date": "13/12/2024", "time": "09:00" },
    { "date": "14/12/2024", "time": "09:00" },
    { "date": "15/12/2024", "time": "09:00" }
  ],
  "locationId": "location-id"
}
```

Response:
```json
{
  "isAvailable": false,
  "unavailableDates": ["14/12/2024"],
  "reason": "Các ngày sau đã được đặt hoặc không khả dụng: 14/12/2024"
}
``` 