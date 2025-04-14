import { ApiProperty } from '@nestjs/swagger';
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

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Tìm kiếm theo từ khóa',
    example: 'keyword',
    required: false,
  })
  term?: string;

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
    description: 'ID của người dùng',
    example: '97004449-52d9-4a49-b071-ce5786f7645e',
    required: false,
  })
  sortBy?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Hướng sắp xếp',
    example: 'asc',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}