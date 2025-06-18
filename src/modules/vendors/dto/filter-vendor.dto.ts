import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max, IsNumberString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { VendorSortField } from 'src/constants/vendor.enum';



export class FilterVendorDto {

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Từ tìm kiếm tên',
    example: 'Nhà hàng',
    required: false,
  })
  name?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Từ tìm kiếm vị trí',
    example: 'Thủ Đức',
    required: false,
  })
  location?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({
    description: 'Giá tối thiểu',
    example: 1000000,
    required: false,
  })
  minPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({
    description: 'Giá tối đa',
    example: 5000000,
    required: false,
  })
  maxPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  @ApiProperty({
    description: 'Điểm đánh giá tối thiểu (0-5)',
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
    description: 'Điểm đánh giá tối đa (0-5)',
    example: 5,
    required: false,
  })
  maxRating?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Loại dịch vụ',
    example: 'C001',
    required: false,
  })
  category?: string;
  
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

  @IsEnum(VendorSortField)
  @IsOptional()
  @ApiProperty({
    description: 'Trường để sắp xếp',
    enum: VendorSortField,
    example: VendorSortField.CREATED_AT,
    required: false,
  })
  sortBy?: VendorSortField;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Hướng sắp xếp (asc hoặc desc)',
    example: 'desc',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @ApiProperty({
    description: 'Vĩ độ của người dùng',
    example: 10.762622,
    required: false,
  })
  userLatitude?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @ApiProperty({
    description: 'Kinh độ của người dùng',
    example: 106.660172,
    required: false,
  })
  userLongitude?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({
    description: 'Khoảng cách tối đa (km) từ vị trí người dùng',
    example: 5,
    required: false,
  })
  maxDistance?: number;
}

export class RemarkableVendorDto {
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

  @IsEnum(VendorSortField)
  @IsOptional()
  @ApiProperty({
    description: 'Trường để sắp xếp',
    enum: VendorSortField,
    example: VendorSortField.SUBSCRIPTION_COUNT,
    required: false,
  })
  sortBy?: VendorSortField;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Hướng sắp xếp (asc hoặc desc)',
    example: 'desc',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
} 