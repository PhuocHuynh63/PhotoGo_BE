# Google Maps Geocoding Integration

## Overview
Tính năng tự động lấy tọa độ (latitude, longitude) từ địa chỉ bằng Google Maps Geocoding API đã được tích hợp vào hệ thống.

## Tính năng

### 1. Tự động lấy tọa độ khi tạo vendor
- Khi tạo vendor với location, hệ thống sẽ tự động lấy tọa độ từ Google Maps nếu không cung cấp
- **Có thể nhập**: address, district, ward, city, province, latitude, longitude
- **Bắt buộc**: address
- **Tùy chọn**: district, ward, city, province, latitude, longitude
- **Lưu ý**: Trong quá trình geocoding, province sẽ được bỏ qua để tránh nhầm lẫn với city

### 2. Tự động lấy tọa độ khi cập nhật vendor
- Khi cập nhật vendor location, tọa độ sẽ được tự động cập nhật nếu có thay đổi địa chỉ

### 3. Fallback mechanism
- Nếu Google Maps không tìm thấy địa chỉ, hệ thống sẽ sử dụng tọa độ đã cung cấp hoặc null
- Nếu API key không có, hệ thống sẽ hoạt động bình thường (không lấy tọa độ)

## Cài đặt

### 1. Google Maps API Key
Thêm vào file `.env`:
```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 2. Lấy Google Maps API Key
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Enable Geocoding API
4. Tạo API Key trong Credentials
5. Copy API Key vào file .env

## Cách sử dụng

### Tạo vendor với tọa độ thủ công (Khuyến nghị nếu có tọa độ chính xác)
```json
{
  "name": "Studio ABC",
  "category_id": "C001",
  "user_id": "user-uuid",
  "location": {
    "address": "123 Đường ABC",
    "district": "Thủ Đức",
    "ward": "Linh Tây", 
    "city": "Hồ Chí Minh",
    "province": "Hồ Chí Minh",
    "latitude": 10.762622,
    "longitude": 106.660172
  }
}
```

### Tạo vendor với tự động lấy tọa độ (Khuyến nghị nếu không có tọa độ)
```json
{
  "name": "Studio ABC",
  "category_id": "C001", 
  "user_id": "user-uuid",
  "location": {
    "address": "123 Đường ABC",
    "district": "Thủ Đức",
    "ward": "Linh Tây",
    "city": "Hồ Chí Minh",
    "province": "Hồ Chí Minh"
  }
}
```

### Tạo vendor với tọa độ thủ công và tắt auto geocoding
```json
{
  "name": "Studio ABC",
  "category_id": "C001", 
  "user_id": "user-uuid",
  "location": {
    "address": "123 Đường ABC",
    "district": "Thủ Đức",
    "ward": "Linh Tây",
    "city": "Hồ Chí Minh",
    "province": "Hồ Chí Minh",
    "latitude": 10.762622,
    "longitude": 106.660172,
    "autoGeocode": false
  }
}
```

### Cập nhật vendor location
```json
{
  "location": {
    "id": "existing-location-id",
    "address": "456 Đường XYZ",
    "district": "Quận 1",
    "ward": "Bến Nghé",
    "city": "Hồ Chí Minh",
    "province": "Hồ Chí Minh"
  }
}
```

## API Endpoints

### POST /vendors
- Tạo vendor mới với tự động lấy tọa độ
- Hỗ trợ single location
- **Có thể cung cấp**: address (bắt buộc), district, ward, city, province, latitude, longitude (tùy chọn)

### PUT /vendors/:id  
- Cập nhật vendor với tự động lấy tọa độ
- Hỗ trợ thay thế location hiện tại

## Cấu trúc Response

### Location với tọa độ tự động
```json
{
  "id": "location-id",
  "address": "123 Đường ABC",
  "district": "Thủ Đức", 
  "ward": "Linh Tây",
  "city": "Hồ Chí Minh",
  "province": "Hồ Chí Minh",
  "latitude": 10.762622,
  "longitude": 106.660172
}
```

## Logs

Hệ thống sẽ log các thông tin sau:
- `Attempting to geocode address: [address]`
- `Successfully geocoded: [lat], [lng]`
- `Failed to geocode address: [address]`
- `Using provided coordinates: [lat], [lng]`
- `Auto geocoding is disabled for this location`

## Lưu ý

1. **API Quota**: Google Maps Geocoding API có giới hạn quota, cần monitor usage
2. **Rate Limiting**: Hệ thống có thể bị rate limit nếu gọi quá nhiều
3. **Fallback**: Nếu geocoding thất bại, vendor vẫn được tạo với tọa độ null
4. **Performance**: Geocoding có thể làm chậm quá trình tạo/cập nhật vendor
5. **Accuracy**: Tọa độ từ Google Maps có thể không chính xác 100% với địa chỉ thực tế
6. **Single Location**: Mỗi vendor chỉ có thể có 1 location duy nhất
7. **Linh hoạt**: Có thể cung cấp tọa độ thủ công hoặc để tự động lấy
8. **Validation**: Tọa độ thủ công sẽ được validate (latitude: -90 đến 90, longitude: -180 đến 180)

## Troubleshooting

### Lỗi "Google Maps API key not found"
- Kiểm tra file .env có GOOGLE_MAPS_API_KEY
- Restart server sau khi thêm API key

### Lỗi "This API project is not authorized to use this API"
- Enable Geocoding API trong Google Cloud Console
- Kiểm tra API key có đúng permissions không
- Kiểm tra billing account

### Lỗi "No results found for address"
- Kiểm tra địa chỉ có chính xác không
- Thử với địa chỉ đầy đủ hơn

### Lỗi "Error during geocoding"
- Kiểm tra internet connection
- Kiểm tra API key có valid không
- Kiểm tra quota có hết không 