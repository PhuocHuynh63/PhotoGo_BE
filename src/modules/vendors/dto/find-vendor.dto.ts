import { IsString, IsOptional, IsEnum, IsNumberString } from 'class-validator';
import { VendorStatus } from '../entities/vendor.entity';

export class FindVendorDto {
  @IsNumberString()
  @IsOptional()
  current?: string;

  @IsNumberString()
  @IsOptional()
  pageSize?: string;

  @IsString()
  @IsOptional()
  term?: string;

  @IsEnum(VendorStatus)
  @IsOptional()
  status?: VendorStatus;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortDirection?: 'asc' | 'desc';
}