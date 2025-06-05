import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export enum SortField {
  CREATED_AT = 'createdAt',
  RATING = 'rating',
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class FilterReviewDto {
  @ApiProperty({ required: false, description: 'Số trang', default: 1 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiProperty({ required: false, description: 'Số lượng item trên mỗi trang', default: 10 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @ApiProperty({ 
    required: false, 
    description: 'Điểm đánh giá (1-5)',
    enum: [1, 2, 3, 4, 5],
    example: 5
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  rating?: number;

  @ApiProperty({ 
    required: false, 
    description: 'Trường sắp xếp',
    enum: SortField,
    example: SortField.CREATED_AT
  })
  @IsOptional()
  @IsEnum(SortField)
  sortField?: SortField = SortField.CREATED_AT;

  @ApiProperty({ 
    required: false, 
    description: 'Hướng sắp xếp',
    enum: SortDirection,
    example: SortDirection.DESC
  })
  @IsOptional()
  @IsEnum(SortDirection)
  sortDirection?: SortDirection = SortDirection.DESC;
} 