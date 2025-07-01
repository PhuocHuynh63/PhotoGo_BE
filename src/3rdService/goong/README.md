# Goong Service

Service tích hợp với GoongAPI - dịch vụ bản đồ và định vị địa lý của Việt Nam.

## Cài đặt

1. Đăng ký tài khoản tại [Goong.io](https://goong.io)
2. Lấy API key từ dashboard
3. Thêm API key vào file `.env`:

```env
GOONG_API_KEY=your_goong_api_key_here
```

## Tính năng

### 1. Geocoding

Chuyển đổi địa chỉ thành tọa độ (latitude/longitude)

```typescript
const result = await goongService.getCoordinatesFromAddress(
  '123 Đường ABC',
  'Quận 1',
  'Phường Bến Nghé',
  'TP. Hồ Chí Minh',
  'Việt Nam', // province - được nhận nhưng không sử dụng để tránh nhầm lẫn với city
);

// Kết quả:
// {
//   latitude: 10.762622,
//   longitude: 106.660172,
//   formattedAddress: "123 Đường ABC, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh, Việt Nam",
//   placeId: "ChIJ...",
//   addressComponents: { ... }
// }
```

**Lưu ý**: Để tránh nhầm lẫn với `city`, tham số `province` được nhận nhưng không được sử dụng khi tạo địa chỉ đầy đủ. Ví dụ: "TP. Hồ Chí Minh" đã là thành phố trực thuộc trung ương, không cần thêm "Việt Nam".

### 2. Reverse Geocoding

Chuyển đổi tọa độ thành địa chỉ

```typescript
const result = await goongService.getAddressFromCoordinates(
  10.762622,
  106.660172,
);

// Kết quả:
// {
//   address: "123 Đường ABC, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh, Việt Nam",
//   addressComponents: { ... }
// }
```

### 3. Tìm kiếm địa điểm

Tìm kiếm các địa điểm theo từ khóa

```typescript
const places = await goongService.searchPlaces(
  'Nhà hàng',
  { lat: 10.762622, lng: 106.660172 },
  5000, // radius in meters
);
```

### 4. Chi tiết địa điểm

Lấy thông tin chi tiết của một địa điểm

```typescript
const placeDetails = await goongService.getPlaceDetails('place_id_here');
```

### 5. Tính khoảng cách

Tính khoảng cách và thời gian di chuyển giữa hai điểm

```typescript
const distance = await goongService.calculateDistance(
  { lat: 10.762622, lng: 106.660172 }, // origin
  { lat: 10.775658, lng: 106.700806 }, // destination
  'driving', // mode: driving, walking, bicycling, transit
);

// Kết quả:
// {
//   distance: 5000, // meters
//   duration: 900,  // seconds
//   distanceText: "5.0 km",
//   durationText: "15 mins"
// }
```

### 6. Kiểm tra API key

Kiểm tra xem API key có hợp lệ không

```typescript
const isValid = await goongService.validateApiKey();
```

## Sử dụng trong Module

```typescript
import { Module } from '@nestjs/common';
import { GoongService } from './3rdService/goong';

@Module({
  providers: [GoongService],
  exports: [GoongService],
})
export class GoongModule {}
```

## So sánh với Google Maps API

| Tính năng         | GoongAPI     | Google Maps API |
| ----------------- | ------------ | --------------- |
| Geocoding         | ✅           | ✅              |
| Reverse Geocoding | ✅           | ✅              |
| Place Search      | ✅           | ✅              |
| Directions        | ✅           | ✅              |
| Tối ưu cho VN     | ✅           | ❌              |
| Chi phí           | Thấp hơn     | Cao hơn         |
| Dữ liệu VN        | Chi tiết hơn | Cơ bản          |

## Xử lý địa chỉ Việt Nam

### Cấu trúc địa chỉ tối ưu:

```typescript
// ✅ Tốt - Sử dụng city thay vì province
const address = {
  address: '123 Đường ABC',
  district: 'Quận 1',
  ward: 'Phường Bến Nghé',
  city: 'TP. Hồ Chí Minh', // Đã bao gồm thông tin tỉnh/thành
  province: 'Việt Nam', // Không được sử dụng trong geocoding
};

// ❌ Tránh - Trùng lặp thông tin
const address = {
  address: '123 Đường ABC',
  district: 'Quận 1',
  ward: 'Phường Bến Nghé',
  city: 'TP. Hồ Chí Minh',
  province: 'TP. Hồ Chí Minh', // Trùng lặp với city
};
```

### Lý do không sử dụng province:

1. **Tránh nhầm lẫn**: Ở Việt Nam, `city` thường đã bao gồm thông tin tỉnh/thành
2. **Độ chính xác**: GoongAPI hoạt động tốt hơn với địa chỉ ngắn gọn
3. **Tối ưu hóa**: Giảm độ phức tạp của query

## Lưu ý

- GoongAPI được tối ưu hóa cho thị trường Việt Nam
- Dữ liệu địa chỉ và bản đồ Việt Nam chi tiết hơn Google Maps
- Chi phí sử dụng thấp hơn Google Maps API
- Hỗ trợ tiếng Việt tốt hơn
- **Quan trọng**: Tham số `province` được nhận nhưng không được sử dụng trong geocoding để tránh nhầm lẫn với `city`
