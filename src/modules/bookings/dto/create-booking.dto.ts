import { IsEnum, IsString, IsUUID, IsOptional, IsNumber, Matches } from 'class-validator';
import { BookingSourceType, BookingDepositType, BookingStatus } from '../../../constants/booking.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @IsString()
  @Matches(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, {
    message: 'Ngày phải có định dạng DD/MM/YYYY'
  })
  @ApiProperty({
    description: 'Ngày booking (định dạng DD/MM/YYYY)',
    example: '01/10/2023'
  })
  date: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Giờ phải có định dạng HH:mm'
  })
  @ApiProperty({
    description: 'Giờ booking (định dạng HH:mm)',
    example: '14:00'
  })
  time: string;

  @IsEnum(BookingSourceType)
  @ApiProperty({
    enum: BookingSourceType,
    description: 'Nguồn booking (trực tiếp, chiến dịch, giới thiệu, nổi bật, khuyến mãi, khác)',
    enumName: 'BookingSourceType',
    example: BookingSourceType.CAMPAIGN
  })
  sourceType: BookingSourceType;

  // @IsUUID()
  // @IsOptional()
  // @ApiProperty({
  //   description: 'ID chiến dịch nếu booking từ chiến dịch',
  //   example: '123e4567-e89b-12d3-a456-426614174003',
  //   required: false
  // })
  // sourceId?: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'Số tiền đặt cọc cho booking',
    example: '100.00',
    required: false
  })
  depositAmount?: number;

  @IsEnum(BookingDepositType)
  @IsOptional()
  @ApiProperty({
    description: 'loại tiền đặt cọc (phần trăm)',
    enum: BookingDepositType,
    enumName: 'BookingDepositType',
    example: BookingDepositType.PERCENTAGE,
    required: false
  })
  depositType?: BookingDepositType;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Số tiền đặt cọc cho booking',
    example: '100.00',
    required: false
  })
  userNote?: string;

  // @IsEnum(BookingStatus)
  // @IsOptional()
  // @ApiProperty({
  //   description: 'Trạng thái booking (chờ xử lý, đã xác nhận, đã hủy, đã hoàn thành)',
  //   enum: BookingStatus,
  //   enumName: 'BookingStatus',
  //   example: BookingStatus.PENDING,
  //   required: false
  // })
  // status?: BookingStatus;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Tên người đặt hàng',
    example: 'John Doe',
    required: false
  })
  fullName?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Số điện thoại người đặt hàng',
    example: '0909090909',
    required: false
  })
  phone?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Email người đặt hàng',
    example: 'john.doe@example.com',
    required: false
  })
  email?: string;

}