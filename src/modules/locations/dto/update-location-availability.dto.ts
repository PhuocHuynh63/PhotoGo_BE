import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsOptional, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLocationAvailabilityDto {
  @ApiProperty({ required: false })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  date?: Date;

  @ApiProperty({ required: false })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format',
  })
  @IsOptional()
  startTime?: string;

  @ApiProperty({ required: false })
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
