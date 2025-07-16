import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, Matches } from 'class-validator';

export class CreateLocationTimeScheduleDto {
  @ApiProperty({
    example: '11/06/2025',
    description: 'Ngày bắt đầu làm việc (định dạng DD/MM/YYYY)',
    required: true,
  })
  @IsString()
  @Matches(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, {
    message: 'Date must be in DD/MM/YYYY format',
  })
  startDate: string;

  @ApiProperty({
    example: '11/06/2025',
    description: 'Ngày kết thúc làm việc (định dạng DD/MM/YYYY)',
    required: true,
  })
  @IsString()
  @Matches(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, {
    message: 'Date must be in DD/MM/YYYY format',
  })
  endDate: string;

  @ApiProperty({
    description: 'Thời gian bắt đầu làm việc (định dạng HH:mm)',
    example: '09:00'
  })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format',
  })
  startTime: string;

  @ApiProperty({
    description: 'Thời gian kết thúc làm việc (định dạng HH:mm)',
    example: '18:00'
  })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format',
  })
  endTime: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  isAvailable: boolean;
} 