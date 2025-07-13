import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { BookingScheduleStatus } from '../../../constants/booking.enum';

export class CreateBookingScheduleDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBookingScheduleDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(BookingScheduleStatus)
  status?: BookingScheduleStatus;

  @IsOptional()
  @IsString()
  postponeReason?: string;

  @IsOptional()
  @IsDateString()
  postponedToDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PostponeBookingScheduleDto {
  @IsString()
  postponeReason: string;

  @IsDateString()
  postponedToDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ContinueBookingScheduleDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BookingScheduleResponseDto {
  @IsUUID()
  id: string;

  @IsUUID()
  bookingId: string;

  @IsDateString()
  date: string;

  @IsEnum(BookingScheduleStatus)
  status: BookingScheduleStatus;

  @IsOptional()
  @IsString()
  postponeReason?: string;

  @IsOptional()
  @IsDateString()
  postponedToDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  created_at: string;

  @IsDateString()
  updated_at: string;
} 