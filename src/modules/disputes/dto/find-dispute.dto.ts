import { IsOptional, IsEnum, IsUUID, IsString } from 'class-validator';
import { DisputeStatus } from 'src/constants/booking.enum'; // Import the DisputeStatus enum

export class FindDisputeDto {
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @IsOptional()
  @IsString()
  term?: string; // For searching by description or other fields
}