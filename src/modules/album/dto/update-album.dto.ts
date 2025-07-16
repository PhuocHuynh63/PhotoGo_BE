import { IsArray, IsOptional, IsString, IsUrl, ArrayMaxSize, IsUUID } from 'class-validator';

export class UpdateAlbumDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsUUID()
  @IsOptional()
  vendorAlbumId?: string;

  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  behindTheScenes?: string[];

  @IsUrl()
  @IsOptional()
  driveLink?: string;
} 