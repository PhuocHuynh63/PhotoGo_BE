import { IsOptional, IsString, IsEnum } from 'class-validator';
import { DisputeStatus } from 'src/constants/booking.enum';

export class UpdateDisputeDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;
} 