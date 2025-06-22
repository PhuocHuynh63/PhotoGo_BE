import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, IsEnum } from 'class-validator';

export enum DayOfWeek {
  Monday = 'Thứ 2',
  Tuesday = 'Thứ 3',
  Wednesday = 'Thứ 4',
  Thursday = 'Thứ 5',
  Friday = 'Thứ 6',
  Saturday = 'Thứ 7',
}

export class UpdateTimeOnlyForDayDto {
  @ApiProperty({
    enum: DayOfWeek,
    example: DayOfWeek.Monday,
    description: 'Ngày trong tuần cần cập nhật thời gian',
    required: true,
  })
  @IsEnum(DayOfWeek)
  day: DayOfWeek;

  @ApiProperty({
    example: '09:00',
    description: 'Thời gian bắt đầu làm việc (định dạng HH:mm)',
    required: true,
  })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format',
  })
  startTime: string;

  @ApiProperty({
    example: '17:00',
    description: 'Thời gian kết thúc làm việc (định dạng HH:mm)',
    required: true,
  })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format',
  })
  endTime: string;
} 