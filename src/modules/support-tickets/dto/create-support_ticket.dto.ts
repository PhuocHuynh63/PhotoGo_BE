import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, Length } from 'class-validator';
import { SupportTicketStatus } from '../entities/support_ticket.entity';

export class CreateSupportTicketDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @ApiProperty({
    description: 'Chủ đề của vé hỗ trợ',
    example: 'Vấn đề với đặt lịch chụp ảnh',
  })
  subject: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Mô tả vấn đề',
    example: 'Đặt lịch ngày 15/04/2025 nhưng không nhận được xác nhận.',
  })
  description: string;

  @IsEnum(SupportTicketStatus)
  @ApiProperty({
    enum: SupportTicketStatus,
    description: 'Trạng thái của vé hỗ trợ',
    example: SupportTicketStatus.OPEN,
  })
  status: SupportTicketStatus;
}