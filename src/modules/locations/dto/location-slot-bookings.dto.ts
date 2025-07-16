import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

export class SlotBookingDetailDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsString()
  status: string;

  @ApiProperty()
  @IsString()
  service: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;
}

export class SlotBookingsDto {
  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  from: string | null;

  @ApiProperty({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  to: string | null;

  @ApiProperty()
  count: number;

  @ApiProperty({ type: [SlotBookingDetailDto] })
  @IsArray()
  bookings: SlotBookingDetailDto[];
}

export class LocationSlotBookingsResponseDto {
  @ApiProperty({ type: [SlotBookingsDto] })
  @IsArray()
  slots: SlotBookingsDto[];
} 