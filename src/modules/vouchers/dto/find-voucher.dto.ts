import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumberString } from 'class-validator';
import { VoucherStatusEnum, VoucherTypePoint, VoucherUserFromEnum, VoucherUserStatusEnum } from '../../../constants/voucher.enum';

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
    example: VoucherTypePoint.CAMPAIGN,
    description: 'Nguồn gốc của voucher (chiến dịch, đổi điểm)',
    enum: VoucherTypePoint,
    required: false,
  })
  type?: VoucherTypePoint;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'active',
    description: 'Trạng thái voucher (active, expired, inactive)',
    enum: VoucherStatusEnum,
    required: false,
  })
  status?: VoucherStatusEnum;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'maxPrice',
    description: 'Trường để sắp xếp',
    enum: ['createdAt', 'updatedAt', 'maxPrice'],
    default: 'maxPrice',
    required: false,
  })
  sortBy?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'desc',
    description: 'Hướng sắp xếp (asc hoặc desc)',
    enum: ['asc', 'desc'],
    default: 'desc',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}

export class FindVoucherUserDto {
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
    example: VoucherUserFromEnum.CAMPAIGN,
    description: 'Nguồn gốc của voucher (chiến dịch, đổi điểm)',
    enum: VoucherUserFromEnum,
    required: false,
  })
  from?: VoucherUserFromEnum;

  @IsString()
  @IsOptional()
  user_id?: string; // Lọc theo user_id

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'có sẵn',
    description: 'Trạng thái voucher user (có sẵn, đã sử dụng, hết hạn)',
    enum: VoucherUserStatusEnum,
    required: false,
  })
  status?: VoucherUserStatusEnum; // Lọc theo trạng thái voucher user

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'maxPrice',
    description: 'Trường để sắp xếp',
    enum: ['assigned_at', 'used_at', 'createdAt', 'updatedAt', 'maxPrice'],
    default: 'maxPrice',
    required: false,
  })
  sortBy?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'desc',
    description: 'Hướng sắp xếp (asc hoặc desc)',
    enum: ['asc', 'desc'],
    default: 'desc',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}