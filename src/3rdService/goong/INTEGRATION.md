# Tích hợp GoongAPI vào PhotoGo Backend

## Tổng quan

Đã tích hợp thành công GoongAPI vào các service hiện tại của PhotoGo Backend, thay thế hoàn toàn Google Maps API cho các chức năng geocoding.

## Các thay đổi đã thực hiện

### 1. LocationService (`src/modules/locations/location.service.ts`)

**Thay đổi:**

- Thay thế `GeocodingService` bằng `GeocodingWrapperService`
- Sử dụng GoongAPI làm provider chính với Google Maps làm fallback
- Cập nhật cả `create` và `updateLocation` methods

**Lợi ích:**

- Tối ưu hóa cho địa chỉ Việt Nam
- Chi phí thấp hơn
- Dữ liệu địa chỉ chi tiết hơn

### 2. VendorService (`src/modules/vendors/vendor.service.ts`)

**Thay đổi:**

- Thay thế `GeocodingService` bằng `GeocodingWrapperService`
- Cập nhật `processLocationWithGeocoding` và `processUpdateLocationWithGeocoding`
- Tự động geocoding khi tạo/cập nhật vendor với location

**Lợi ích:**

- Tự động lấy tọa độ khi tạo vendor mới
- Cập nhật tọa độ khi thay đổi địa chỉ
- Fallback tự động nếu GoongAPI không hoạt động

### 3. Module Updates

**LocationModule (`src/modules/locations/location.module.ts`):**

```typescript
import { GoongModule } from 'src/3rdService/goong';

@Module({
  imports: [
    // ... other imports
    GoongModule,
  ],
  // ...
})
```

**VendorModule (`src/modules/vendors/vendor.module.ts`):**

```typescript
import { GoongModule } from '../../3rdService/goong';

@Module({
  imports: [
    // ... other imports
    GoongModule,
  ],
  // ...
})
```

## Cách hoạt động

### 1. Geocoding Flow

```typescript
// Khi tạo location hoặc vendor với địa chỉ
const result = await geocodingWrapperService.getCoordinatesFromAddress(
  address,
  district,
  ward,
  city,
  province, // Được nhận nhưng không sử dụng trong GoongAPI để tránh nhầm lẫn với city
);

// Kết quả:
// {
//   latitude: 10.762622,
//   longitude: 106.660172,
//   formattedAddress: "123 Đường ABC, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh, Việt Nam",
//   provider: "goong", // hoặc "google" nếu fallback
//   placeId: "ChIJ...",
//   addressComponents: { ... }
// }
```

**Lưu ý quan trọng**:

- **GoongAPI**: Chỉ sử dụng `address`, `district`, `ward`, `city` (không dùng `province`)
- **Google Maps**: Sử dụng tất cả các tham số bao gồm `province`
- Lý do: Ở Việt Nam, `city` thường đã bao gồm thông tin tỉnh/thành (ví dụ: "TP. Hồ Chí Minh" đã là thành phố trực thuộc trung ương)

### 2. Fallback Strategy

1. **Ưu tiên GoongAPI** (priority: 1)

   - Tối ưu cho Việt Nam
   - Dữ liệu chi tiết hơn
   - Chi phí thấp hơn

2. **Fallback Google Maps** (priority: 2)
   - Khi GoongAPI không hoạt động
   - Khi không tìm thấy kết quả
   - Đảm bảo tính ổn định

### 3. Provider Selection

```typescript
// Có thể chọn provider cụ thể
const result = await geocodingWrapperService.getCoordinatesFromAddress(
  address,
  district,
  ward,
  city,
  province,
  'goong', // hoặc 'google'
);
```

## Cấu hình

### 1. Environment Variables

Thêm vào file `.env`:

```env
# GoongAPI Key (bắt buộc)
GOONG_API_KEY=your_goong_api_key_here

# Google Maps API Key (fallback, tùy chọn)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 2. Đăng ký GoongAPI

1. Truy cập [Goong.io](https://goong.io)
2. Đăng ký tài khoản
3. Tạo project mới
4. Lấy API key từ dashboard

## Monitoring và Debugging

### 1. Provider Status

```typescript
// Kiểm tra trạng thái các provider
const status = await geocodingWrapperService.checkProvidersStatus();
console.log(status);
// { google: true, goong: true }
```

### 2. Provider Comparison

```typescript
// So sánh kết quả từ cả hai provider
const comparison = await geocodingWrapperService.compareProviders(
  '123 Đường ABC, Quận 1, TP. Hồ Chí Minh',
);
console.log(comparison);
// {
//   google: { latitude: 10.762622, longitude: 106.660172, ... },
//   goong: { latitude: 10.762623, longitude: 106.660173, ... },
//   differences: { latitudeDiff: 0.000001, longitudeDiff: 0.000001, addressSimilarity: 0.95 }
// }
```

## Lợi ích

### 1. Hiệu suất

- **Tốc độ**: GoongAPI nhanh hơn cho địa chỉ Việt Nam
- **Độ chính xác**: Dữ liệu địa chỉ chi tiết hơn
- **Fallback**: Đảm bảo tính ổn định

### 2. Chi phí

- **GoongAPI**: Miễn phí 1000 requests/tháng, sau đó rẻ hơn Google Maps
- **Google Maps**: $5 cho 1000 requests

### 3. Dữ liệu

- **Địa chỉ Việt Nam**: Chi tiết hơn, cập nhật thường xuyên
- **Tiếng Việt**: Hỗ trợ tốt hơn
- **Địa điểm local**: Nhiều địa điểm nhỏ hơn

## Troubleshooting

### 1. API Key Issues

```typescript
// Kiểm tra API key
const isValid = await goongService.validateApiKey();
if (!isValid) {
  console.error('GoongAPI key không hợp lệ');
}
```

### 2. Fallback Issues

```typescript
// Kiểm tra cả hai provider
const status = await geocodingWrapperService.checkProvidersStatus();
if (!status.goong && !status.google) {
  console.error('Cả hai provider đều không hoạt động');
}
```

### 3. Logging

Tất cả các hoạt động geocoding đều được log với level phù hợp:

- `INFO`: Thành công
- `WARN`: Fallback hoặc lỗi nhẹ
- `ERROR`: Lỗi nghiêm trọng

## Migration Guide

### Từ Google Maps sang GoongAPI

1. **Cập nhật imports**:

   ```typescript
   // Trước
   import { GeocodingService } from 'src/3rdService/google/geocoding.service';

   // Sau
   import { GeocodingWrapperService } from 'src/3rdService/goong';
   ```

2. **Cập nhật constructor**:

   ```typescript
   // Trước
   constructor(private readonly geocodingService: GeocodingService) {}

   // Sau
   constructor(private readonly geocodingWrapperService: GeocodingWrapperService) {}
   ```

3. **Cập nhật method calls**:

   ```typescript
   // Trước
   const result = await this.geocodingService.validateAndGetCoordinates(...);

   // Sau
   const result = await this.geocodingWrapperService.getCoordinatesFromAddress(...);
   ```

4. **Cập nhật module**:

   ```typescript
   // Trước
   imports: [GeocodingModule];

   // Sau
   imports: [GoongModule];
   ```

## Kết luận

Việc tích hợp GoongAPI đã hoàn thành thành công, mang lại:

- **Hiệu suất tốt hơn** cho thị trường Việt Nam
- **Chi phí thấp hơn** so với Google Maps
- **Tính ổn định cao** với fallback mechanism
- **Dữ liệu chi tiết hơn** cho địa chỉ Việt Nam

Hệ thống hiện tại đã sẵn sàng sử dụng GoongAPI làm provider chính cho tất cả các chức năng geocoding.
