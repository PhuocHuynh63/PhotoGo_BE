import { IsEnum, IsDateString, IsString, IsUUID, IsOptional } from 'class-validator';
import { BookingSourceType, BookingDepositType } from '../../../constants/booking.enum';

export class CreateBookingDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  vendorId: string;

  @IsUUID()
  servicePackageId: string;

  @IsDateString()
  date: string;

  @IsString()
  time: string;

  @IsEnum(BookingSourceType)
  sourceType: BookingSourceType;

  @IsUUID()
  @IsOptional()
  sourceId?: string;

  @IsEnum(BookingDepositType)
  @IsOptional()
  depositType?: BookingDepositType;

  @IsString()
  @IsOptional()
  userNote?: string;
}