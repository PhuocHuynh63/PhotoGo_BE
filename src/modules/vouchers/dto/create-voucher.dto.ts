import { ApiProperty, ApiResponse } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, IsNumber, IsDateString } from 'class-validator';
import { VoucherUserStatusEnum, VoucherTypeDiscount } from 'src/constants/voucher.enum';

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
  description: string;


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
    example: VoucherUserStatusEnum.ACTIVE,
  })
  status: string;
}