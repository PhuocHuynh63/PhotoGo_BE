import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, Length } from 'class-validator';
import { SupportTicketStatus } from '../entities/support_ticket.entity';

export class CreateSupportTicketDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @ApiProperty({
    description: 'Subject of the support ticket',
    example: 'Vấn đề với đặt lịch chụp ảnh',
  })
  subject: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Description of the issue',
    example: 'Đặt lịch ngày 15/04/2025 nhưng không nhận được xác nhận.',
  })
  description: string;

  @IsEnum(SupportTicketStatus)
  @ApiProperty({
    enum: SupportTicketStatus,
    description: 'Status of the support ticket',
    example: SupportTicketStatus.OPEN,
  })
  status: SupportTicketStatus;
}