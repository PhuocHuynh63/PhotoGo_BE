import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';


export class PaginationDto {
  @ApiProperty({ description: 'Trang hiện tại', type: Number, example: 1, required: false })
  @IsOptional()
  @IsNumber()
  current?: number;

  @ApiProperty({ description: 'Số lượng phần tử trên mỗi trang', type: Number, example: 10, required: false })
  @IsOptional()
  @IsNumber()
  pageSize?: number;

  @ApiProperty({ 
    description: 'Cột sắp xếp', 
    type: String, 
    example: 'createdAt', 
    required: false,
    enum: ['createdAt', 'updatedAt', 'name', 'price', 'description', 'status']
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ 
    description: 'Hướng sắp xếp', 
    type: String, 
    example: 'asc', 
    required: false,
    enum: ['asc', 'desc']
  })
  @IsOptional()
  @IsString()
  sortDirection?: string;

  @ApiPropertyOptional({ description: 'Hiển thị tất cả', type: String, example: 'false', required: false })
  @IsOptional()
  showAll?: string;
}