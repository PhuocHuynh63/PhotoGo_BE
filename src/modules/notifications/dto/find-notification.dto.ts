import { IsString, IsOptional, IsEnum, IsBoolean, IsNumberString } from 'class-validator';
import { NotificationType } from 'src/constants/notification.enum';

export class FindNotificationDto {
  @IsNumberString()
  @IsOptional()
  current?: string;

  @IsNumberString()
  @IsOptional()
  pageSize?: string;

  @IsString()
  @IsOptional()
  term?: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsBoolean()
  @IsOptional()
  is_read?: boolean;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortDirection?: 'asc' | 'desc';
}