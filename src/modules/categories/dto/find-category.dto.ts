import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumberString } from 'class-validator';

export class FindCategoryDto {
  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Số thứ tự của trang hiện tại',
    example: '1',
    required: false,
  })
  current?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Số lượng bản ghi trên mỗi trang',
    example: '10',
    required: false,
  })
  pageSize?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Tìm kiếm theo từ khóa',
    example: 'keyword',
    required: false,
  })
  term?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Theo name hoặc id hoặc description',
    example: 'name',
    required: false,
  })
  sortBy?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Hướng sắp xếp',
    example: 'asc',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}