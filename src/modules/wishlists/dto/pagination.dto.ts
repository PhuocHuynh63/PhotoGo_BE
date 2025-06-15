import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @ApiProperty({
    description: 'Trang hiện tại',
    example: 1,
    default: 1,
    required: false
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  current?: number = 1;

  @ApiProperty({
    description: 'Số item trên mỗi trang',
    example: 10,
    default: 10,
    required: false
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  pageSize?: number = 10;

  @ApiProperty({
    description: 'Trường để sắp xếp',
    example: 'created_at',
    default: 'created_at',
    required: false
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'created_at';

  @ApiProperty({
    description: 'Kiểu sắp xếp (ASC/DESC)',
    example: 'DESC',
    default: 'DESC',
    enum: ['ASC', 'DESC'],
    required: false
  })
  @IsString()
  @IsOptional()
  sortType?: 'ASC' | 'DESC' = 'DESC';
} 