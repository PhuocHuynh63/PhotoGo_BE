# Frontend API Guide - Multi-Day Booking

## 📋 **Tổng quan API**

Frontend cần sử dụng các API sau để implement multi-day booking với validation:

## 🔍 **1. API Kiểm tra Availability**

### **Single Day Booking**
```typescript
GET /bookings/check-slot-availability?date=13/12/2024&time=09:00&locationId=xxx
```

**Response:**
```json
{
  "isAvailable": true,
  "reason": null,
  "alreadyBooked": 0,
  "maxParallelBookings": 1
}
```

### **Multi-Day Booking (MỚI)**
```typescript
POST /bookings/check-multi-day-availability
{
  "schedules": [
    { "date": "13/12/2024", "time": "09:00", "notes": "Chụp ảnh cưới" },
    { "date": "14/12/2024", "time": "09:00", "notes": "Chụp ảnh cưới" },
    { "date": "15/12/2024", "time": "09:00", "notes": "Chụp ảnh cưới" }
  ],
  "locationId": "123e4567-e89b-12d3-a456-426614174000",
  "serviceConceptId": "123e4567-e89b-12d3-a456-426614174001"
}
```

**Response:**
```json
{
  "isAvailable": false,
  "unavailableDates": ["14/12/2024"],
  "reason": "Các ngày sau đã được đặt hoặc không khả dụng: 14/12/2024"
}
```

## 🚀 **2. API Tạo Booking**

### **Single Day Booking**
```typescript
POST /bookings?userId=xxx&serviceConceptId=xxx
{
  "bookingType": "SINGLE_DAY",
  "locationId": "123e4567-e89b-12d3-a456-426614174000",
  "date": "13/12/2024",
  "time": "09:00",
  "fullName": "Nguyễn Văn A",
  "phone": "0123456789",
  "email": "nguyenvana@email.com"
}
```

### **Multi-Day Booking**
```typescript
POST /bookings?userId=xxx&serviceConceptId=xxx
{
  "bookingType": "MULTI_DAY",
  "locationId": "123e4567-e89b-12d3-a456-426614174000",
  "schedules": [
    { "date": "13/12/2024", "time": "09:00", "notes": "Chụp ảnh cưới" },
    { "date": "14/12/2024", "time": "09:00", "notes": "Chụp ảnh cưới" },
    { "date": "15/12/2024", "time": "09:00", "notes": "Chụp ảnh cưới" }
  ],
  "fullName": "Nguyễn Văn A",
  "phone": "0123456789",
  "email": "nguyenvana@email.com"
}
```

**Response:**
```json
{
  "booking": {
    "id": "booking-id",
    "code": "PG123456",
    "bookingType": "MULTI_DAY",
    "status": "PENDING",
    "schedules": [...]
  },
  "paymentLink": "https://payos.vn/checkout/...",
  "code": "PG123456"
}
```

## 📋 **3. API Lấy Thông tin Booking**

### **Lấy danh sách booking**
```typescript
GET /bookings?current=1&pageSize=10
```

### **Lấy chi tiết booking**
```typescript
GET /bookings/:id
```

### **Lấy booking theo code**
```typescript
GET /bookings/get-by-code?code=PG123456
```

## 🎯 **Flow Implementation trên Frontend**

### **Step 1: Tạo Booking Form**

```typescript
// BookingForm.tsx
interface BookingFormProps {
  bookingType: 'SINGLE_DAY' | 'MULTI_DAY';
  locationId: string;
  serviceConceptId: string;
}

const BookingForm: React.FC<BookingFormProps> = ({ bookingType, locationId, serviceConceptId }) => {
  const [schedules, setSchedules] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(false);

  // Kiểm tra availability khi schedules thay đổi
  const checkAvailability = async () => {
    if (bookingType === 'MULTI_DAY' && schedules.length > 0) {
      setLoading(true);
      try {
        const response = await api.post('/bookings/check-multi-day-availability', {
          schedules,
          locationId,
          serviceConceptId
        });
        setAvailability(response.data);
      } catch (error) {
        console.error('Error checking availability:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    checkAvailability();
  }, [schedules]);

  return (
    <div>
      {bookingType === 'MULTI_DAY' && (
        <ScheduleSelector 
          schedules={schedules}
          onChange={setSchedules}
          availability={availability}
        />
      )}
      
      {availability && !availability.isAvailable && (
        <Alert type="error" message={availability.reason} />
      )}
      
      <BookingFormFields />
    </div>
  );
};
```

### **Step 2: Schedule Selector Component**

```typescript
// ScheduleSelector.tsx
interface ScheduleSelectorProps {
  schedules: Array<{ date: string; time: string; notes?: string }>;
  onChange: (schedules: Array<{ date: string; time: string; notes?: string }>) => void;
  availability: {
    isAvailable: boolean;
    unavailableDates: string[];
    reason?: string;
  } | null;
}

const ScheduleSelector: React.FC<ScheduleSelectorProps> = ({ schedules, onChange, availability }) => {
  const addSchedule = () => {
    onChange([...schedules, { date: '', time: '', notes: '' }]);
  };

  const updateSchedule = (index: number, field: string, value: string) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    onChange(newSchedules);
  };

  const removeSchedule = (index: number) => {
    onChange(schedules.filter((_, i) => i !== index));
  };

  return (
    <div>
      <h3>Chọn các ngày booking</h3>
      
      {schedules.map((schedule, index) => (
        <div key={index} className="schedule-item">
          <DatePicker
            value={schedule.date}
            onChange={(date) => updateSchedule(index, 'date', date)}
            disabled={availability?.unavailableDates?.includes(schedule.date)}
          />
          <TimePicker
            value={schedule.time}
            onChange={(time) => updateSchedule(index, 'time', time)}
          />
          <Input
            placeholder="Ghi chú"
            value={schedule.notes}
            onChange={(e) => updateSchedule(index, 'notes', e.target.value)}
          />
          <Button onClick={() => removeSchedule(index)}>Xóa</Button>
        </div>
      ))}
      
      <Button onClick={addSchedule}>Thêm ngày</Button>
      
      {availability && (
        <AvailabilityStatus availability={availability} />
      )}
    </div>
  );
};
```

### **Step 3: Availability Status Component**

```typescript
// AvailabilityStatus.tsx
interface AvailabilityStatusProps {
  availability: {
    isAvailable: boolean;
    unavailableDates: string[];
    reason?: string;
  };
}

const AvailabilityStatus: React.FC<AvailabilityStatusProps> = ({ availability }) => {
  if (availability.isAvailable) {
    return <Alert type="success" message="Tất cả các ngày đều khả dụng!" />;
  }

  return (
    <Alert type="error">
      <div>
        <p>{availability.reason}</p>
        {availability.unavailableDates.length > 0 && (
          <div>
            <strong>Các ngày không khả dụng:</strong>
            <ul>
              {availability.unavailableDates.map(date => (
                <li key={date}>{date}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Alert>
  );
};
```

### **Step 4: Submit Booking**

```typescript
// BookingForm.tsx
const handleSubmit = async (formData) => {
  try {
    const bookingData = {
      bookingType,
      locationId,
      serviceConceptId,
      ...formData
    };

    if (bookingType === 'MULTI_DAY') {
      bookingData.schedules = schedules;
    } else {
      bookingData.date = formData.date;
      bookingData.time = formData.time;
    }

    const response = await api.post('/bookings', bookingData, {
      params: { userId, serviceConceptId }
    });

    // Redirect to payment
    window.location.href = response.data.paymentLink;
  } catch (error) {
    console.error('Error creating booking:', error);
    // Show error message
  }
};
```

## 🎨 **UI/UX Recommendations**

### **1. Booking Type Selection**
```typescript
// Hiển thị 2 option cho user chọn
<Radio.Group value={bookingType} onChange={setBookingType}>
  <Radio value="SINGLE_DAY">Đặt 1 ngày</Radio>
  <Radio value="MULTI_DAY">Đặt nhiều ngày</Radio>
</Radio.Group>
```

### **2. Real-time Validation**
- Kiểm tra availability ngay khi user chọn ngày
- Hiển thị loading state khi đang kiểm tra
- Disable các ngày không khả dụng

### **3. Error Handling**
```typescript
// Hiển thị lỗi rõ ràng
{availability && !availability.isAvailable && (
  <Alert 
    type="error" 
    message={availability.reason}
    description="Vui lòng chọn ngày khác hoặc liên hệ với chúng tôi"
  />
)}
```

### **4. Success Feedback**
```typescript
// Khi tất cả ngày đều available
{availability && availability.isAvailable && (
  <Alert 
    type="success" 
    message="Tất cả các ngày đều khả dụng!"
    description="Bạn có thể tiếp tục đặt booking"
  />
)}
```

## 🔧 **Error Codes & Messages**

| Error | Message | Action |
|-------|---------|--------|
| `400` | Dữ liệu không hợp lệ | Kiểm tra lại form |
| `404` | Không tìm thấy slot | Chọn slot khác |
| `409` | Ngày đã được đặt | Chọn ngày khác |
| `500` | Lỗi server | Thử lại sau |

## 📱 **Mobile Considerations**

- Sử dụng date picker native cho mobile
- Tối ưu form cho touch input
- Hiển thị loading states rõ ràng
- Responsive design cho schedule selector

## 🧪 **Testing Scenarios**

### **Test Case 1: Single Day Booking**
1. Chọn booking type: Single Day
2. Chọn ngày và giờ
3. Kiểm tra slot availability
4. Submit booking
5. Verify payment link

### **Test Case 2: Multi-Day Booking - Success**
1. Chọn booking type: Multi Day
2. Thêm 3 ngày (13, 14, 15/12)
3. Verify tất cả ngày available
4. Submit booking
5. Verify payment link

### **Test Case 3: Multi-Day Booking - Conflict**
1. Chọn booking type: Multi Day
2. Thêm ngày 14/12 (đã có người đặt)
3. Verify error message
4. Verify ngày 14 bị disable
5. Chọn ngày khác

### **Test Case 4: Payment Flow**
1. Tạo booking thành công
2. Click payment link
3. Complete payment
4. Verify booking status = PAID
5. Verify ngày bị đóng (multi-day) 