import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumberString, IsUUID, IsDate } from 'class-validator';
import { VendorStatus } from 'src/constants/vendor.enum';

export class FindVendorDto {
  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '1',
    description: 'Trang hiện tại cho phân trang',
    required: false,
  })
  current?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '10',
    description: 'Số lượng mục trên mỗi trang cho phân trang',
    required: false,
  })
  pageSize?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'Studio Ánh Sáng',
    description: 'Từ tìm kiếm để lọc nhà cung cấp',
    required: false,
  })
  term?: string;

  @IsEnum(VendorStatus)
  @IsOptional()
  @ApiProperty({
    enum: VendorStatus,
    description: 'Trạng thái của nhà cung cấp',
    example: VendorStatus.ACTIVE,
    required: false,
  })
  status?: VendorStatus;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'created_at',
    description: 'Trường để sắp xếp',
    required: false,
  })
  sortBy?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'asc',
    description: 'Hướng sắp xếp (asc hoặc desc)',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}

export class VendorManagerFilterDto {
  @IsUUID()
  @IsOptional()
  @ApiProperty({
    example: 'uuid-of-manager',
    description: 'Lọc nhà cung cấp theo ID người quản lý',
    required: false,
  })
  managerUserId?: string;
}

export class VendorLikeFilterDto {
  @IsUUID()
  @IsOptional()
  @ApiProperty({
    example: 'uuid-of-user',
    description: 'Lọc nhà cung cấp được thích bởi một người dùng cụ thể',
    required: false,
  })
  likedByUserId?: string;
}

export class VendorAvailabilityFilterDto {
  @IsDate()
  @IsOptional()
  @ApiProperty({
    example: '2025-04-17',
    description: 'Lọc nhà cung cấp có sẵn trong ngày cụ thể',
    required: false,
  })
  availableDate?: Date;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: '09:00',
    description: 'Lọc nhà cung cấp có sẵn bắt đầu từ thời gian cụ thể',
    required: false,
  })
  availableStartTime?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: '18:00',
    description: 'Lọc nhà cung cấp có sẵn cho đến thời gian cụ thể',
    required: false,
  })
  availableEndTime?: string;
}