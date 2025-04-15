import { IsEnum, IsDateString, IsString, IsUUID, IsOptional } from 'class-validator';
import { BookingSourceType, BookingDepositType } from '../../../constants/booking.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  
  @IsUUID()
  @ApiProperty({
    description: 'User ID of the person making the booking',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  userId: string;

  @IsUUID()
  @ApiProperty({
    description: 'Vendor ID of the service provider',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  vendorId: string;

  @IsUUID()
  @ApiProperty({
    description: 'Service ID of the booked service',
    example: '123e4567-e89b-12d3-a456-426614174002'
  })
  servicePackageId: string;

  @IsDateString()
  @ApiProperty({
    description: 'Date of the booking',
    example: '2023-10-01'
  })
  date: string;

  @IsString()
  @ApiProperty({
    description: 'Time of the booking',
    example: '14:00'
  })
  time: string;

  @IsEnum(BookingSourceType)
  @ApiProperty({
    description: 'Source type of the booking',
    enum: BookingSourceType,
    example: BookingSourceType.CAMPAIGN
  })
  sourceType: BookingSourceType;

  @IsUUID()
  @IsOptional()
  @ApiProperty({
    description: 'Campaign ID if the booking is from a campaign',
    example: '123e4567-e89b-12d3-a456-426614174003',
    required: false
  })
  sourceId?: string;

  @IsEnum(BookingDepositType)
  @IsOptional()
  @ApiProperty({
    description: 'Deposit type for the booking',
    enum: BookingDepositType,
    example: BookingDepositType.PERCENTAGE,
    required: false
  })
  depositType?: BookingDepositType;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Deposit amount for the booking',
    example: '100.00',
    required: false
  })
  userNote?: string;
}