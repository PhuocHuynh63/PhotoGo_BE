import { IsString, IsOptional, IsNumberString } from 'class-validator';

export class FindVoucherUserDto {
  @IsNumberString()
  @IsOptional()
  current?: string;

  @IsNumberString()
  @IsOptional()
  pageSize?: string;

  @IsString()
  @IsOptional()
  user_id?: string; // Lọc theo user_id

  @IsString()
  @IsOptional()
  status?: string; // Lọc theo trạng thái voucher (active, expired, used)

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortDirection?: 'asc' | 'desc';
}