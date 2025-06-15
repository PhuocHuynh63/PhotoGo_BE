import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SearchLocationDto {
  @ApiProperty({ required: false, description: 'Từ khóa tìm kiếm (tìm trong tất cả các trường)' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false, description: 'Địa chỉ' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, description: 'Quận/Huyện' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({ required: false, description: 'Phường/Xã' })
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiProperty({ required: false, description: 'Thành phố' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false, description: 'Tỉnh/Thành phố' })
  @IsOptional()
  @IsString()
  province?: string;
} 