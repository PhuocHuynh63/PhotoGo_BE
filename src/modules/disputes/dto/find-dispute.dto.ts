import { IsOptional, IsEnum, IsUUID, IsString, IsNumber } from 'class-validator';
import { DisputeStatus } from 'src/constants/booking.enum'; // Import the DisputeStatus enum
import { Type } from 'class-transformer';

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

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  current?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number;
}