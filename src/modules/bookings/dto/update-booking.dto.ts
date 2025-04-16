import { IsEnum, IsOptional } from 'class-validator';
import { BookingStatus } from '../../../constants/booking.enum';

export class UpdateBookingDto {
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;
}