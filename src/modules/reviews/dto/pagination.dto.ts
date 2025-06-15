import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @ApiProperty({ description: 'Trang hiện tại', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  current?: number;

  @ApiProperty({ description: 'Số lượng item trên mỗi trang', required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number;

  @ApiProperty({ description: 'Sắp xếp theo', enum: ['rating', 'created_at'], required: false, default: 'created_at' })
  @IsOptional()
  @IsEnum(['rating', 'created_at'])
  sortBy?: 'rating' | 'created_at';

  @ApiProperty({ description: 'Hướng sắp xếp', enum: ['asc', 'desc'], required: false, default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
} 