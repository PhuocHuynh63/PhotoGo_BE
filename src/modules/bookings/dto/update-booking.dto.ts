import { IsEnum, IsNumber, IsOptional, IsString, IsEmail, Matches } from 'class-validator';
import { BookingDepositType, BookingStatus, BookingSourceType } from '../../../constants/booking.enum';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBookingDto {
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  time?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @Matches(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, {
    message: 'Số điện thoại không hợp lệ',
  })
  @IsOptional()
  phone?: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsOptional()
  email?: string;

  @IsEnum(BookingDepositType)
  @IsOptional()
  depositType?: BookingDepositType;

  @IsNumber()
  @IsOptional()
  depositAmount?: number;

  @IsEnum(BookingSourceType)
  @IsOptional()
  sourceType?: BookingSourceType;

  @IsString()
  @IsOptional()
  userNote?: string;
}

export class UpdateBookingHistoryStatusDto {
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;
}

export class UpdateStatusDto {
  @ApiProperty({ description: 'Trạng thái booking', enum: BookingStatus, example: BookingStatus.PENDING })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;
}