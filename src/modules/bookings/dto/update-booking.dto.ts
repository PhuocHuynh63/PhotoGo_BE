import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { BookingDepositType, BookingStatus } from '../../../constants/booking.enum';

export class UpdateBookingDto {
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;
}

export class UpdateBookingHistoryStatusDto {
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;
}
