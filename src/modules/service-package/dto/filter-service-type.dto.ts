import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ServiceTypeStatus } from 'src/constants/serviceType.enum';

export class FilterServiceTypeDto {
  @ApiPropertyOptional({
    description: 'Tên loại dịch vụ để tìm kiếm',
    example: 'Chụp ảnh cưới'
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái của loại dịch vụ',
    enum: ServiceTypeStatus,
    example: ServiceTypeStatus.ACTIVE,
    default: ServiceTypeStatus.ACTIVE
  })
  @IsOptional()
  @IsEnum(ServiceTypeStatus)
  status?: ServiceTypeStatus;

  @ApiPropertyOptional({
    description: 'Sắp xếp theo trường',
    enum: ['name', 'created_at', 'concept_count', 'package_count'],
    example: 'name'
  })
  @IsOptional()
  @IsEnum(['name', 'created_at', 'concept_count', 'package_count'])
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Hướng sắp xếp',
    enum: ['asc', 'desc'],
    example: 'asc'
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection?: string;

  @ApiPropertyOptional({
    description: 'Trang hiện tại',
    example: 1,
    minimum: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  current?: number;

  @ApiPropertyOptional({
    description: 'Số lượng item trên mỗi trang',
    example: 10,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Hiển thị tất cả', type: Boolean, example: 'false', required: false })
  @IsOptional()
  showAll?: boolean;
} 