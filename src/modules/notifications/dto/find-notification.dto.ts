import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsEnum, IsBoolean, IsNumberString } from 'class-validator';
import { NotificationType } from 'src/constants/notification.enum';

export class FindNotificationDto {
  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Số thứ tự của trang hiện tại',
    example: '1',
    required: false,
  })
  current?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Số lượng bản ghi trên mỗi trang',
    example: '10',
    required: false,
  })
  pageSize?: string;

  @IsEnum(NotificationType)
  @IsOptional()
  @ApiProperty({
    description: 'Loại thông báo',
    enum: NotificationType,
    required: false,
  })
  type?: NotificationType;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    description: 'Trạng thái đã đọc của thông báo',
    example: true,
    required: false,
  })
  is_read?: boolean;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Gì cũng được',
    enum: ['created_at', 'updated_at'],
    example: 'created_at',
    required: false,
  })
  sortBy?: 'created_at' | 'updated_at';

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Hướng sắp xếp',
    enum: ['asc', 'desc'],
    example: 'asc',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}


export class FindNotificationDtoByUser {
  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Số thứ tự của trang hiện tại',
    example: '1',
    required: false,
  })
  current?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Số lượng bản ghi trên mỗi trang',
    example: '10',
    required: false,
  })
  pageSize?: string;

  @IsEnum(NotificationType)
  @IsOptional()
  @ApiProperty({
    description: 'Loại thông báo',
    enum: NotificationType,
    required: false,
  })
  type?: NotificationType;

}