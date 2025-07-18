import { IsDate, IsDateString, IsEnum, IsOptional, IsUUID, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { AlbumStatus } from 'src/constants/album.enum';

export class CreateAlbumMultipartDto {
  @ApiProperty({ type: 'string', description: 'Location ID' })
  @IsUUID()
  locationId: string;

  @ApiProperty({ type: 'string', format: 'url', required: false, description: 'Google Drive link' })
  @IsUrl()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)   
  driveLink?: string;

  @ApiProperty({ type: 'string', description: 'Booking ID' })
  @IsUUID()
  bookingId: string;

  @ApiProperty({ type: 'string', description: 'Date' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: 'string', description: 'Status', enum: AlbumStatus, default: AlbumStatus.NOT_UPLOAD, required: false })
  @IsEnum(AlbumStatus)
  @IsOptional()
  status?: AlbumStatus;
} 