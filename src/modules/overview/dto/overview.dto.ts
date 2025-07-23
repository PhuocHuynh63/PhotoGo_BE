import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OverviewType, AdminStatisticsType } from 'src/constants/overview.enum';

export class OverviewDto {
  
  @ApiProperty({
    description: 'Location ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({
    description: 'Start date',
    example: '01/01/2025',
    required: false,
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({
    description: 'End date',
    example: '01/01/2025',
    required: false,
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({
    enum: OverviewType,
    description: 'Type',
    example: OverviewType.FINANCE, 
  })
  @IsOptional()
  @IsEnum(OverviewType)
  type?: OverviewType;

  @ApiProperty({
    description: 'Vendor ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  vendorId?: string;

  // @ApiProperty({
  //   description: 'Category',
  //   example: 'finance',
  //   required: false,
  // })
  // @IsOptional()
  // @IsString()
  // category?: string;

  // @ApiProperty({
  //   description: 'Status',
  //   example: 'finance',
  //   required: false,
  // })
  // @IsOptional()
  // @IsString()
  // status?: string;
} 

// Placeholder for admin overview statistics DTO
// export { AdminStatisticsType };
export class AdminOverviewDto {
  @ApiProperty({
    enum: AdminStatisticsType,
    description: 'Loại thống kê',
    example: AdminStatisticsType.ALL,
    required: false,
  })
  @IsOptional()
  @IsEnum(AdminStatisticsType)
  type?: AdminStatisticsType;

  @ApiProperty({
    description: 'Năm cần thống kê (ví dụ: 2024)',
    required: false,
    example: 2024,
  })
  @IsOptional()
  year?: number;

  @ApiProperty({
    description: 'Trang hiện tại (phân trang vendor)',
    required: false,
    example: 1,
  })
  @IsOptional()
  current?: number;

  @ApiProperty({
    description: 'Số lượng vendor trên mỗi trang',
    required: false,
    example: 10,
  })
  @IsOptional()
  pageSize?: number;
  // Add properties for admin-level statistics here
  // Example: global date range, filters, etc.
} 