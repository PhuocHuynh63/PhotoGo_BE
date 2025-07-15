# Vietnamese Response and Exception Message Rule

## Rule Type
Auto Attached

## File pattern matches
src/**/*.ts

## Rule

Ensure that:
- All `@ApiOperation({ summary })` have summary in Vietnamese.
- All `@ApiResponse({ description })` have descriptions in Vietnamese.
- All `@ApiProperty({ description })` have descriptions in Vietnamese.
- All enums that are shown to end-users must use Vietnamese values (e.g., `SUCCESS = "thành công"`).
- All error messages in exceptions must be in Vietnamese.
- All validation messages must be in Vietnamese.
- All API documentation must be in Vietnamese.

Reason:
To maintain consistency and localization for Vietnamese end users.

## Examples

✅ Correct:
```typescript
@ApiOperation({ 
  summary: 'Tạo gói dịch vụ mới' 
})

@ApiResponse({ 
  status: 200, 
  description: 'Gói dịch vụ đã được tạo thành công' 
})

@ApiProperty({ 
  description: 'Tên của gói dịch vụ' 
})

throw new HttpException('Không tìm thấy gói dịch vụ', HttpStatus.NOT_FOUND);

// Enum example
export enum Status {
  ACTIVE = 'hoạt động',
  INACTIVE = 'không hoạt động'
}

// Validation example
@IsNotEmpty({ message: 'Tên không được để trống' })
```

❌ Incorrect:
```typescript
@ApiOperation({ 
  summary: 'Create new service package' 
})

@ApiResponse({ 
  status: 200, 
  description: 'Service package created successfully' 
})

@ApiProperty({ 
  description: 'Name of the service package' 
})

throw new HttpException('Service package not found', HttpStatus.NOT_FOUND);

// Enum example
export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

// Validation example
@IsNotEmpty({ message: 'Name is required' })
```

## Common Vietnamese Phrases

### Success Messages
- "đã được tạo thành công" (created successfully)
- "đã được cập nhật thành công" (updated successfully)
- "đã được xóa thành công" (deleted successfully)
- "đã được tìm thấy" (found successfully)
- "đã được xác nhận" (confirmed successfully)
- "đã được gửi" (sent successfully)

### Error Messages
- "Không tìm thấy" (not found)
- "Dữ liệu không hợp lệ" (invalid data)
- "Đã xảy ra lỗi" (an error occurred)
- "Không có quyền truy cập" (unauthorized access)
- "Vui lòng thử lại" (please try again)
- "Đã hết hạn" (expired)
- "Đã tồn tại" (already exists)

### Status Messages
- "hoạt động" (active)
- "không hoạt động" (inactive)
- "tạm ngưng" (suspended)
- "đã xóa" (deleted)
- "chờ xử lý" (pending)
- "đã hoàn thành" (completed)
- "đã hủy" (cancelled)

### Validation Messages
- "không được để trống" (cannot be empty)
- "phải là số" (must be a number)
- "phải là email hợp lệ" (must be a valid email)
- "phải có ít nhất {n} ký tự" (must have at least {n} characters)
- "phải có tối đa {n} ký tự" (must have maximum {n} characters)
- "phải chứa ít nhất một chữ hoa" (must contain at least one uppercase letter)
- "phải chứa ít nhất một chữ thường" (must contain at least one lowercase letter)
- "phải chứa ít nhất một số" (must contain at least one number)
- "phải chứa ít nhất một ký tự đặc biệt" (must contain at least one special character) 