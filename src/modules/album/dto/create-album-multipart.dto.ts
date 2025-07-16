import { IsOptional, IsUUID, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAlbumMultipartDto {
  @ApiProperty({ type: 'string', description: 'Location ID' })
  @IsUUID()
  locationId: string;
    
  @ApiProperty({ type: 'string', description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ type: 'string', format: 'url', required: false, description: 'Google Drive link' })
  @IsUrl()
  @IsOptional()
  driveLink?: string;
} 