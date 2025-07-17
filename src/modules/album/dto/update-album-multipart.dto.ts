import { IsDateString, IsEnum, IsOptional, IsUUID, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AlbumStatus } from 'src/constants/album.enum';

export class UpdateAlbumMultipartDto {

  @ApiProperty({ type: 'string', required: false, description: 'Location ID' })
  @IsUUID()
  @IsOptional()
  locationId?: string;

  @ApiProperty({ type: 'string', format: 'url', required: false, description: 'Google Drive link' })
  @IsUrl()
  @IsOptional()
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