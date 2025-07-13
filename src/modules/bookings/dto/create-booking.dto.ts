import { IsEnum, IsString, IsUUID, IsOptional, IsNumber, Matches, IsNotEmpty, IsArray, ValidateNested, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { BookingSourceType, BookingDepositType, BookingStatus, BookingType } from '../../../constants/booking.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingScheduleItemDto {
  @IsString()
  @Matches(/^([0-2][0-9]|3[0-1])\/(0[1-9]|1[0-2])\/\d{4}$/, {
    message: 'Ngày phải có định dạng DD/MM/YYYY'
  })
  @ApiProperty({
    description: 'Ngày booking (định dạng DD/MM/YYYY)',
    example: '04/06/2025'
  })
  date: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Ghi chú cho ngày này',
    example: 'Chụp ảnh ngoại cảnh',
    required: false
  })
  notes?: string;
}

export class CreateBookingDto {
  @IsEnum(BookingType)
  @ApiProperty({
    enum: BookingType,
    description: 'Loại booking (một ngày hoặc nhiều ngày)',
    enumName: 'BookingType',
    example: BookingType.SINGLE_DAY
  })
  bookingType: BookingType;

  // For single day booking
  @ValidateIf(o => o.bookingType === BookingType.SINGLE_DAY)
  @IsString()
  @Matches(/^([0-2][0-9]|3[0-1])\/(0[1-9]|1[0-2])\/\d{4}$/, {
    message: 'Ngày phải có định dạng DD/MM/YYYY'
  })
  @ApiProperty({
    description: 'Ngày booking (định dạng DD/MM/YYYY) - chỉ dùng cho booking 1 ngày',
    example: '04/06/2025',
    required: false
  })
  date?: string;

  @ValidateIf(o => o.bookingType === BookingType.SINGLE_DAY)
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Giờ phải có định dạng HH:mm'
  })
  @ApiProperty({
    description: 'Giờ booking (định dạng HH:mm) - chỉ dùng cho booking 1 ngày',
    example: '13:00',
    required: false
  })
  time?: string;

  // For multi-day booking
  @ValidateIf(o => o.bookingType === BookingType.MULTI_DAY)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBookingScheduleItemDto)
  @ApiProperty({
    description: 'Danh sách các ngày booking - chỉ dùng cho booking nhiều ngày',
    type: [CreateBookingScheduleItemDto],
    example: [
      {
        date: '04/06/2025',
        notes: 'Chụp ảnh ngoại cảnh'
      },
      {
        date: '05/06/2025',
        notes: 'Chụp ảnh studio'
      }
    ],
    required: false
  })
  schedules?: CreateBookingScheduleItemDto[];

  @IsEnum(BookingSourceType)
  @ApiProperty({
    enum: BookingSourceType,
    description: 'Nguồn booking (trực tiếp, chiến dịch, giới thiệu, nổi bật, khuyến mãi, khác)',
    enumName: 'BookingSourceType',
    example: BookingSourceType.CAMPAIGN
  })
  sourceType: BookingSourceType;

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID chi nhánh (location)',
    example: '123e4567-e89b-12d3-a456-426614174003',
    required: true
  })
  locationId: string;

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
    example: '30.00',
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
    description: 'Ghi chú của người dùng',
    example: 'Không có',
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

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'ID voucher',
    example: '123e4567-e89b-12d3-a456-426614174003',
    required: false
  })
  voucherId?: string;
}