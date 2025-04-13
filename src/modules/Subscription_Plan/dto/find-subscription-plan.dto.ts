import { IsString, IsOptional, IsNumberString } from 'class-validator';

export class FindSubscriptionPlanDto {
  @IsNumberString()
  @IsOptional()
  current?: string;

  @IsNumberString()
  @IsOptional()
  pageSize?: string;

  @IsString()
  @IsOptional()
  term?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortDirection?: 'asc' | 'desc';
}