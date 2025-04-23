import { IsEnum, IsDateString, IsString, IsUUID, IsOptional } from 'class-validator';
import { BookingSourceType, BookingDepositType, BookingStatus } from '../../../constants/booking.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @IsDateString()
  @ApiProperty({
    description: 'Date of the booking',
    example: '2023-10-01'
  })
  date: string;

  @IsString()
  @ApiProperty({
    description: 'Time of the booking',
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

  @IsUUID()
  @IsOptional()
  @ApiProperty({
    description: 'Campaign ID if the booking is from a campaign',
    example: '123e4567-e89b-12d3-a456-426614174003',
    required: false
  })
  sourceId?: string;

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
    description: 'Deposit amount for the booking',
    example: '100.00',
    required: false
  })
  userNote?: string;

  @IsEnum(BookingStatus)
  @IsOptional()
  @ApiProperty({
    description: 'Trạng thái booking (chờ xử lý, đã xác nhận, đã hủy, đã hoàn thành)',
    enum: BookingStatus,
    enumName: 'BookingStatus',
    example: BookingStatus.PENDING,
    required: false
  })
  status?: BookingStatus;
}