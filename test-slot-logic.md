# Test Slot Locking Logic

## Logic Flow

### 1. Người 1 đặt lịch
1. **Check slot availability** → `isSlotAvailableForBooking()` (bao gồm timeout check)
2. **Lock slot** → `lockSlotForBooking()` 
3. **Create booking** với status `PENDING`
4. **Create PayOS link** và trả về cho user

### 2. Người 2 đặt lịch (cùng thời gian)
1. **Check slot availability** → `isSlotAvailableForBooking()` 
   - Nếu người 1 đã thanh toán → Slot không available
   - Nếu người 1 chưa thanh toán nhưng chưa timeout (15 phút) → Slot không available  
   - Nếu người 1 đã timeout → Slot available
2. **Nếu available** → Lock slot → Create booking → Create PayOS link
3. **Nếu không available** → Trả về lỗi

### 3. Webhook PayOS
1. **Check slot availability** → `isSlotAvailableForBooking()` (bao gồm timeout)
2. **Nếu available** → Process payment → Unlock slot
3. **Nếu không available** → Create refund record → Send email

## Test Scenarios

### Scenario 1: Người 1 đặt → Người 2 đặt ngay lập tức
- **Expected**: Người 2 nhận lỗi "Slot đã được đặt hoặc đang trong quá trình thanh toán"

### Scenario 2: Người 1 đặt → Đợi 16 phút → Người 2 đặt  
- **Expected**: Người 2 có thể đặt được (timeout đã xảy ra)

### Scenario 3: Người 1 đặt → Thanh toán thành công → Người 2 đặt
- **Expected**: Người 2 nhận lỗi "Slot đã được đặt bởi người khác"

### Scenario 4: Người 1 đặt → Người 2 đặt → Người 1 thanh toán
- **Expected**: Người 1 thanh toán thành công, Người 2 bị refund

## API Endpoints

### Check Slot Availability
```
GET /bookings/check-slot-availability?date=25/12/2024&time=09:00&locationId=xxx
```

### Create Booking
```
POST /bookings
{
  "date": "25/12/2024",
  "time": "09:00", 
  "locationId": "xxx",
  ...
}
```

## Timeout Configuration
- **Timeout duration**: 15 phút
- **Timeout check**: Trong `formatSlotTimeWorkingDates()` method
- **Auto cleanup**: `handleBookingTimeout()` method (có thể chạy cron job)

## Key Methods

### LocationAvailabilityService
- `isSlotAvailableForBooking()`: Check availability với timeout
- `lockSlotForBooking()`: Lock slot cho booking process
- `unlockSlot()`: Unlock slot sau khi thanh toán thành công
- `formatSlotTimeWorkingDates()`: Format slot data với timeout check

### BookingService  
- `checkSlotAvailability()`: Simple availability check
- `checkSlotAvailabilityWithDetails()`: Detailed availability check
- `create()`: Create booking với slot locking
- `handleBookingTimeout()`: Auto cancel expired bookings

### PaymentService
- `handlePayOSWebhook()`: Process payment với slot availability check 