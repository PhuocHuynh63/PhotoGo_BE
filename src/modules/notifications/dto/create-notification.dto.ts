import { IsString, IsNotEmpty, Length, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { NotificationType } from 'src/constants/notification.enum';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @IsBoolean()
  @IsOptional()
  is_read?: boolean;
}