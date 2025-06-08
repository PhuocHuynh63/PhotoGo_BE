import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsEnum, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterReviewDto {
  @ApiProperty({ required: false, description: 'Số trang hiện tại' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  current?: number;

  @ApiProperty({ required: false, description: 'Số lượng item trên mỗi trang' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number;

  @ApiProperty({ required: false, description: 'Lọc theo điểm đánh giá (1-5)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiProperty({ required: false, enum: ['rating', 'created_at'], description: 'Sắp xếp theo' })
  @IsOptional()
  @IsEnum(['rating', 'created_at'])
  sortBy?: 'rating' | 'created_at';

  @ApiProperty({ required: false, enum: ['asc', 'desc'], description: 'Hướng sắp xếp' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}