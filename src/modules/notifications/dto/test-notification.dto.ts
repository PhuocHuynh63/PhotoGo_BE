import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../../../constants/notification.enum';

export class TestNotificationDto {
    @ApiProperty({ description: 'Tiêu đề thông báo', example: 'Test Notification' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ description: 'Nội dung thông báo', example: 'This is a test notification' })
    @IsString()
    @IsNotEmpty()
    message: string;

    @ApiProperty({
        description: 'Loại thông báo',
        enum: NotificationType,
        example: NotificationType.INFO,
        required: false
    })
    @IsOptional()
    @IsEnum(NotificationType)
    type?: NotificationType;

} 