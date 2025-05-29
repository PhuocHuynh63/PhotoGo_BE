import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumberString } from 'class-validator';

export class FindVoucherDto {
  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '1',
    description: 'Số trang cho phép chia',
    required: false,
  })
  current?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '10',
    description: 'Số mục trên mỗi trang cho phép chia',
    required: false,
  })  
  pageSize?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'GiamGia20',
    description: 'Từ tìm kiếm để lọc mã giảm giá',
    required: false,
  })
  term?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'created_at',
    description: 'Trường để sắp xếp',
    required: false,
  })
  sortBy?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'asc',
    description: 'Hướng sắp xếp (asc hoặc desc)',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}

export class FindVoucherUserDto {
  @IsNumberString()
  @IsOptional()
  current?: string;

  @IsNumberString()
  @IsOptional()
  pageSize?: string;

  @IsString()
  @IsOptional()
  user_id?: string; // Lọc theo user_id

  @IsString()
  @IsOptional()
  status?: string; // Lọc theo trạng thái voucher (active, expired, used)

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortDirection?: 'asc' | 'desc';
}