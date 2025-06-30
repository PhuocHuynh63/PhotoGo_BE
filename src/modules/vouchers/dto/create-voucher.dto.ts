import { ApiProperty, ApiResponse } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, IsNumber, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { assign } from 'nodemailer/lib/shared';
import { VoucherUserStatusEnum, VoucherTypeDiscount, VoucherStatusEnum, VoucherTypePoint } from 'src/constants/voucher.enum';

export class CreateVoucherDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @ApiProperty({
    description: 'Mã giảm giá',
    example: 'GiamGia20',
  })
  code: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @ApiProperty({
    description: 'Tên mã giảm giá',
    example: 'Giảm giá 20% cho đơn hàng trên 500.000 VNĐ',
  })
  description?: string;


  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  @ApiProperty({
    description: 'Loại giảm giá (phần trăm, cố định)',
    example: VoucherTypeDiscount.PERCENTAGE,
  })
  discount_type: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Giá trị giảm giá',
    example: 20,
  })
  discount_value: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Giá trị giảm giá',
    example: 20,
  })
  minPrice: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Giá trị giảm giá',
    example: 20,
  })
  maxPrice: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Số lượng mã giảm giá',
    example: 100,
  })
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Số lượng mã giảm giá đã sử dụng',
    example: 0,
  })
  usedCount: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Số lượng điểm thưởng',
    example: 100,
  })
  point: number;

  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  @ApiProperty({
    description: 'Loại mã giảm giá (phần trăm, cố định)',
    example: VoucherTypePoint.POINT,
  })
  type: VoucherTypePoint;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Ngày bắt đầu áp dụng mã giảm giá',
    example: '2025-10-01',
  })
  start_date: string;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Ngày kết thúc áp dụng mã giảm giá',
    example: '2025-12-31',
  })
  end_date: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  @ApiProperty({
    description: 'Trạng thái của mã giảm giá (hoạt động, không hoạt động)',
    example: VoucherStatusEnum.ACTIVE,
  })
  status: VoucherStatusEnum;
}

export class CreateVoucherUserDto {
  @IsOptional()
  @IsEnum(VoucherUserStatusEnum)
  @ApiProperty({
    description: 'Trạng thái của mã giảm giá cho người dùng (có sẵn, đã sử dụng, hết hạn)',
    example: VoucherUserStatusEnum.AVAILABLE,
    default: VoucherUserStatusEnum.AVAILABLE,
  })
  status: VoucherUserStatusEnum; // Optional field, default to 'available' if not provided

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Ngày gán mã giảm giá cho người dùng',
    example: '2025-10-01',
    default: new Date().toISOString(),
    required: false,
  })
  assigned_at?: string;
}