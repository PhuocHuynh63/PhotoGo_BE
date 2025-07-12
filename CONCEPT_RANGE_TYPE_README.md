# Concept Range Type Feature

## Tổng quan

Tính năng Concept Range Type cho phép phân biệt rõ ràng giữa các concept 1 ngày và nhiều ngày, từ đó áp dụng logic booking phù hợp.

## Các trường mới

### 1. `conceptRangeType` (enum)
- **SINGLE_DAY**: Concept chỉ diễn ra trong 1 ngày
- **MULTIPLE_DAYS**: Concept diễn ra trong nhiều ngày

### 2. `numberOfDays` (integer)
- Số ngày concept kéo dài
- Mặc định: 1
- Tối thiểu: 1

## Logic tự động

### Khi tạo concept mới:

1. **Nếu không cung cấp `conceptRangeType`**:
   - Hệ thống tự động xác định dựa trên `numberOfDays`
   - `numberOfDays > 1` → `MULTIPLE_DAYS`
   - `numberOfDays = 1` → `SINGLE_DAY`

2. **Nếu `conceptRangeType = SINGLE_DAY`**:
   - `numberOfDays` tự động set = 1
   - `duration` giữ nguyên hoặc default = 60 phút

3. **Nếu `conceptRangeType = MULTIPLE_DAYS`**:
   - `duration` tự động set = 0
   - `numberOfDays` phải >= 2

### Khi cập nhật concept:

Logic tương tự như khi tạo mới, nhưng chỉ áp dụng cho các trường được cập nhật.

## Logic Booking

### Concept 1 ngày (`SINGLE_DAY`):
- Sử dụng logic booking cũ
- Yêu cầu: `date`, `time`
- Validation: slot availability, duration overlap
- Timeout: 15 phút

### Concept nhiều ngày (`MULTIPLE_DAYS`):
- Sử dụng logic booking mới
- Yêu cầu: `schedules` array với `numberOfDays` items
- Validation: overall availability, working dates
- Không có timeout (đóng toàn bộ ngày)

## API Examples

### Filter Service Packages by Concept Range Type:

```bash
# Filter packages with single day concepts only
GET /service-packages/filter?conceptRangeType=single_day

# Filter packages with multiple days concepts only  
GET /service-packages/filter?conceptRangeType=multiple_days

# Combine with other filters
GET /service-packages/filter?conceptRangeType=single_day&minPrice=1000000&maxPrice=5000000
```

### Tạo concept 1 ngày:
```json
{
  "name": "Chụp ảnh cưới cơ bản",
  "price": 5000000,
  "duration": 120,
  "conceptRangeType": "single_day",
  "numberOfDays": 1
}
```

### Tạo concept nhiều ngày:
```json
{
  "name": "Chụp ảnh cưới cao cấp",
  "price": 15000000,
  "conceptRangeType": "multiple_days",
  "numberOfDays": 3
}
```

### Booking concept 1 ngày:
```json
{
  "date": "25/12/2024",
  "time": "09:00",
  "locationId": "uuid",
  "fullName": "Nguyễn Văn A",
  "phone": "0123456789"
}
```

### Booking concept nhiều ngày:
```json
{
  "schedules": [
    {
      "date": "25/12/2024",
      "time": "09:00",
      "notes": "Chụp ngoại cảnh"
    },
    {
      "date": "26/12/2024", 
      "time": "14:00",
      "notes": "Chụp studio"
    },
    {
      "date": "27/12/2024",
      "time": "10:00", 
      "notes": "Chụp album"
    }
  ],
  "locationId": "uuid",
  "fullName": "Nguyễn Văn A",
  "phone": "0123456789"
}
```

## Migration

Chạy migration để thêm 2 trường mới vào database:

```bash
npm run migration:run
```

## Validation Rules

### STRICT VALIDATION RULES:

1. **Concept 1 ngày (`SINGLE_DAY`)**:
   - `numberOfDays` **MUST** = 1 (không được phép 2, 3, 4...)
   - `duration` **MUST** > 0 (bắt buộc phải có thời gian thực hiện)
   - `conceptRangeType` = SINGLE_DAY

2. **Concept nhiều ngày (`MULTIPLE_DAYS`)**:
   - `numberOfDays` **MUST** >= 2 (ít nhất 2 ngày)
   - `duration` **MUST** = 0 (không được phép modify)
   - `conceptRangeType` = MULTIPLE_DAYS

3. **Booking validation**:
   - Concept 1 ngày: yêu cầu `date` và `time`
   - Concept nhiều ngày: yêu cầu `schedules` với đúng số ngày

### Error Messages:
- `"Concept 1 ngày chỉ được phép có numberOfDays = 1"`
- `"Concept 1 ngày phải có duration > 0"`
- `"Concept nhiều ngày phải có numberOfDays >= 2"`
- `"Concept nhiều ngày phải có duration = 0"`

## UI Implementation

### Filter UI:
- Thêm dropdown/tabs để filter theo `conceptRangeType`
- Tab "1 Ngày" → filter `conceptRangeType=single_day`
- Tab "Nhiều Ngày" → filter `conceptRangeType=multiple_days`
- Tab "Tất cả" → không filter

### Display Logic:
- Hiển thị badge/tag cho mỗi concept:
  - "1 Ngày" cho `SINGLE_DAY`
  - "Nhiều Ngày" cho `MULTIPLE_DAYS`
- Hiển thị số ngày: `numberOfDays` cho concept nhiều ngày
- Hiển thị duration cho concept 1 ngày

### Booking UI:
- Concept 1 ngày: Hiển thị date picker + time picker
- Concept nhiều ngày: Hiển thị multiple date/time pickers theo `numberOfDays` 