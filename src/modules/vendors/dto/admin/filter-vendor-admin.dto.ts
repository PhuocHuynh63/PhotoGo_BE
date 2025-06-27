import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max, IsNumberString, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { VendorStatus } from 'src/constants/vendor.enum';

export class FilterVendorAdminDto {
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Từ tìm kiếm tên nhà cung cấp',
    example: 'Studio',
    required: false,
  })
  name?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Từ tìm kiếm thông tin liên hệ',
    example: '0901234567',
    required: false,
  })
  contact?: string;

  @IsEnum(VendorStatus)
  @IsOptional()
  @ApiProperty({
    description: 'Trạng thái nhà cung cấp',
    enum: VendorStatus,
    example: VendorStatus.ACTIVE,
    required: false,
  })
  status?: VendorStatus;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({
    description: 'Số chi nhánh tối thiểu',
    example: 1,
    required: false,
  })
  minBranches?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({
    description: 'Số chi nhánh tối đa',
    example: 10,
    required: false,
  })
  maxBranches?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({
    description: 'Số package tối thiểu',
    example: 1,
    required: false,
  })
  minPackages?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({
    description: 'Số package tối đa',
    example: 20,
    required: false,
  })
  maxPackages?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({
    description: 'Số order tối thiểu',
    example: 0,
    required: false,
  })
  minOrders?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({
    description: 'Số order tối đa',
    example: 100,
    required: false,
  })
  maxOrders?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  @ApiProperty({
    description: 'Đánh giá tối thiểu (0-5)',
    example: 4,
    required: false,
  })
  minRating?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  @ApiProperty({
    description: 'Đánh giá tối đa (0-5)',
    example: 5,
    required: false,
  })
  maxRating?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(10)
  @Type(() => Number)
  @ApiProperty({
    description: 'Độ ưu tiên tối thiểu (0-10)',
    example: 5,
    required: false,
  })
  minPriority?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(10)
  @Type(() => Number)
  @ApiProperty({
    description: 'Độ ưu tiên tối đa (0-10)',
    example: 10,
    required: false,
  })
  maxPriority?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Ngày tham gia từ (YYYY-MM-DD)',
    example: '2024-01-01',
    required: false,
  })
  joinDateFrom?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Ngày tham gia đến (YYYY-MM-DD)',
    example: '2024-12-31',
    required: false,
  })
  joinDateTo?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Danh mục',
    example: 'C001',
    required: false,
  })
  category?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  @ApiProperty({
    description: 'Có logo hay không',
    example: true,
    required: false,
  })
  hasLogo?: boolean;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Trang hiện tại cho phân trang',
    example: '1',
    required: false,
  })
  current?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Số lượng mục trên mỗi trang',
    example: '10',
    required: false,
  })
  pageSize?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Trường để sắp xếp',
    example: 'created_at',
    enum: ['createdAt', 'updatedAt','name','category','priority','order_count','package_count','branch_count'],
    required: false,
  })
  sortBy?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Hướng sắp xếp (asc hoặc desc)',
    example: 'desc',
    enum: ['asc', 'desc'],
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}
