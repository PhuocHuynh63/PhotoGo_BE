import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumberString } from 'class-validator';
import { SupportTicketStatus } from '../entities/support_ticket.entity';

export class FindSupportTicketDto {
  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '1',
    description: 'Trang hiện tại',
    required: false,
  })
  current?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '10',
    description: 'Số lượng mục trên mỗi trang',
    required: false,
  })
  pageSize?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'Vấn đề với đặt lịch',
    description: 'Từ khóa tìm kiếm',
    required: false,
  })
  term?: string;

  @IsEnum(SupportTicketStatus)
  @IsOptional()
  @ApiProperty({
    enum: SupportTicketStatus,
    description: 'Trạng thái của vé hỗ trợ',
    example: SupportTicketStatus.OPEN,
    required: false,
  })
  status?: SupportTicketStatus;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'created_at',
    description: 'Trường để sắp xếp',
    required: false,
  })
  sortBy?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'asc',
    description: 'Hướng sắp xếp (asc hoặc desc)',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}