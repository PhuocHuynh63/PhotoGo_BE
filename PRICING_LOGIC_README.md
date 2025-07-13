# Pricing Logic Implementation

## Tổng quan

Hệ thống đã được cập nhật để sử dụng **reverse pricing calculation** - cách tính ngược giá để đảm bảo giá hiển thị cho khách hàng luôn là số tròn, dễ nhìn.

## Cách hoạt động

### 1. Công thức tính toán

```
Final Price (Customer sees) = Origin Price + Commission + Tax
Commission = Origin Price × 30%
Tax = Origin Price × 5%
Final Price = Origin Price × (1 + 0.3 + 0.05) = Origin Price × 1.35
Origin Price = Final Price ÷ 1.35
```

### 2. Ví dụ thực tế

**Input**: Khách hàng muốn hiển thị giá 500,000 VND

**Tính toán**:
- Final Price = 500,000 VND
- Origin Price = 500,000 ÷ 1.35 = 370,370 VND
- Commission = 370,370 × 30% = 111,111 VND  
- Tax = 370,370 × 5% = 18,519 VND
- Verification: 370,370 + 111,111 + 18,519 = 500,000 VND ✅

### 3. Lưu trữ trong Database

- **ServiceConcept.price**: Lưu Origin Price (370,370 VND)
- **Commission.amount**: Lưu Commission Amount (111,111 VND)
- **Commission.rate**: Lưu Commission Rate (30%)

### 4. Hiển thị cho Customer

- **API Response**: Hiển thị Final Price (500,000 VND)
- **Invoice**: 
  - Price = Origin Price + Commission (481,481 VND)
  - Tax = Tax Amount (18,519 VND)
  - Total = Final Price (500,000 VND)

## Các method quan trọng

### 1. Tính toán ngược (từ Final Price → Origin Price)
```typescript
private calculateOriginPrice(finalPrice: number): number
private getPricingBreakdown(finalPrice: number): PricingBreakdown
```

### 2. Tính toán thuận (từ Origin Price → Final Price)
```typescript
private calculateFinalPrice(originPrice: number): number
private getPricingBreakdownFromOrigin(originPrice: number): PricingBreakdown
```

### 3. Lấy pricing cho Invoice
```typescript
public getInvoicePricingBreakdown(serviceConceptId: string): Promise<PricingBreakdown>
```

## Cách sử dụng

### 1. Tạo Service Concept
```typescript
// Input: Giá customer sẽ thấy
const createDto = {
  name: "Chụp ảnh cưới",
  price: 500000, // Final price - customer sees this
  // ... other fields
};

// Service sẽ tự động:
// 1. Tính Origin Price = 370,370 VND
// 2. Lưu Origin Price vào DB
// 3. Tạo Commission record
// 4. Trả về concept với Final Price
```

### 2. Lấy pricing cho Invoice
```typescript
const pricing = await servicePackageService.getInvoicePricingBreakdown(conceptId);

// Kết quả:
// {
//   originPrice: 370370,
//   commissionAmount: 111111,
//   taxAmount: 18519,
//   finalPrice: 500000
// }

// Sử dụng cho invoice:
const invoiceData = {
  price: pricing.originPrice + pricing.commissionAmount, // 481,481 VND
  taxAmount: pricing.taxAmount, // 18,519 VND
  totalAmount: pricing.finalPrice // 500,000 VND
};
```

### 3. Filter theo giá
```typescript
// Input: Giá customer thấy
const filterParams = {
  minPrice: 400000, // Customer sees 400k
  maxPrice: 600000  // Customer sees 600k
};

// Service tự động convert:
// minOriginPrice = 400000 ÷ 1.35 = 296,296 VND
// maxOriginPrice = 600000 ÷ 1.35 = 444,444 VND
```

## Lợi ích

1. **Trải nghiệm người dùng tốt hơn**: Giá hiển thị luôn là số tròn
2. **Bảo mật thông tin**: Commission không hiển thị cho customer
3. **Theo chuẩn thương mại**: Giống cách các cửa hàng lớn hoạt động
4. **Dễ quản lý**: Admin chỉ cần nhập giá cuối cùng

## Constants

```typescript
private readonly COMMISSION_RATE = 0.30; // 30%
private readonly TAX_RATE = 0.05; // 5%
private readonly TOTAL_MULTIPLIER = 1.35; // 1 + 0.3 + 0.05
```

## Lưu ý quan trọng

1. **Database**: Luôn lưu Origin Price, không lưu Final Price
2. **API Response**: Luôn trả về Final Price cho customer
3. **Invoice**: Chỉ hiển thị Price (Origin + Commission) và Tax
4. **Commission**: Không bao giờ hiển thị riêng cho customer
5. **Rounding**: Sử dụng `Math.round()` để tránh lỗi floating point 