import { IsOptional, IsUUID, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAlbumMultipartDto {
  @ApiProperty({ type: 'string', required: false, description: 'User ID' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({ type: 'string', required: false, description: 'Location ID' })
  @IsUUID()
  @IsOptional()
  locationId?: string;

  @ApiProperty({ type: 'string', format: 'url', required: false, description: 'Google Drive link' })
  @IsUrl()
  @IsOptional()
  driveLink?: string;
} 