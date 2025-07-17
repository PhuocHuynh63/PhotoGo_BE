import { IsArray, IsOptional, IsString, IsUrl, ArrayMaxSize, IsUUID } from 'class-validator';

export class CreateAlbumDto {
  @IsUUID()
  vendorAlbumId: string;

  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  photos: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  behindTheScenes?: string[];

  @IsUrl()
  @IsOptional()
  driveLink?: string;
} 