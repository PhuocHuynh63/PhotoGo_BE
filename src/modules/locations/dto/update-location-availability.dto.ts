import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsOptional, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLocationAvailabilityDto {
  @ApiProperty({ required: false })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  date?: Date;

  @ApiProperty({ description: 'Thời gian bắt đầu làm việc (định dạng HH:mm)', required: false, example: '09:00' })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format',
  })
  @IsOptional()
  startTime?: string;

  @ApiProperty({ description: 'Thời gian kết thúc làm việc (định dạng HH:mm)', required: false, example: '18:00' })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format',
  })
  @IsOptional()
  endTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  isAvailable?: boolean;
} 
