import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumberString } from 'class-validator';
import { SupportTicketStatus } from '../entities/support_ticket.entity';

export class FindSupportTicketDto {
  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '1',
    description: 'Page number for pagination',
    required: false,
  })
  current?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '10',
    description: 'Number of items per page for pagination',
    required: false,
  })
  pageSize?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'Vấn đề với đặt lịch',
    description: 'Search term for filtering support tickets',
    required: false,
  })
  term?: string;

  @IsEnum(SupportTicketStatus)
  @IsOptional()
  @ApiProperty({
    enum: SupportTicketStatus,
    description: 'Status of the support ticket',
    example: SupportTicketStatus.OPEN,
    required: false,
  })
  status?: SupportTicketStatus;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'created_at',
    description: 'Field to sort by',
    required: false,
  })
  sortBy?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'asc',
    description: 'Sort direction (asc or desc)',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}