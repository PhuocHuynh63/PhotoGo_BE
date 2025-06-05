import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsString, IsUUID, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLocationAvailabilityDto {
  @ApiProperty()
  @IsUUID()
  locationId: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiProperty()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format',
  })
  startTime: string;

  @ApiProperty()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format',
  })
  endTime: string;

  @ApiProperty()
  isAvailable: boolean;
} 