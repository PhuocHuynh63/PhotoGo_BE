import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, IsUUID } from 'class-validator';

export class AlbumPaginationDto {
  @ApiProperty({
    description: 'Số trang hiện tại',
    default: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  current?: number = 1;

  @ApiProperty({
    description: 'Số lượng item trên mỗi trang',
    default: 10,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  pageSize?: number = 10;

  @ApiProperty({
    description: 'Sắp xếp theo trường nào',
    enum: ['createdAt', 'updatedAt'],
    default: 'createdAt',
    required: false,
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Sắp xếp theo hướng nào',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    required: false,
  })
  @IsString()
  @IsOptional()
  sortDirection?: string = 'DESC';
} 