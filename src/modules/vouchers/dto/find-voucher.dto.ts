import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumberString } from 'class-validator';

export class FindVoucherDto {
  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '1',
    description: 'Page number for pagination',
    required: false,
  })
  current?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '10',
    description: 'Number of items per page for pagination',
    required: false,
  })  
  pageSize?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'GiamGia20',
    description: 'Search term for filtering vouchers',
    required: false,
  })
  term?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'created_at',
    description: 'Field to sort by',
    required: false,
  })
  sortBy?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'asc',
    description: 'Sort direction (asc or desc)',
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