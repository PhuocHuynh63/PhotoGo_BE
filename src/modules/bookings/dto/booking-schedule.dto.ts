import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { BookingScheduleStatus } from '../../../constants/booking.enum';

export class CreateBookingScheduleDto {
  @IsDateString()
  date: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:mm format' })
  time: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBookingScheduleDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:mm format' })
  time?: string;

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
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:mm format' })
  postponedToTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PostponeBookingScheduleDto {
  @IsString()
  postponeReason: string;

  @IsDateString()
  postponedToDate: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:mm format' })
  postponedToTime: string;

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

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:mm format' })
  time: string;

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
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:mm format' })
  postponedToTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  created_at: string;

  @IsDateString()
  updated_at: string;
} 