import { IsString, IsOptional } from 'class-validator';

export class VendorCancelBookingDto {
  @IsString()
  vendorId: string;

  @IsOptional()
  @IsString()
  reason?: string;
} 