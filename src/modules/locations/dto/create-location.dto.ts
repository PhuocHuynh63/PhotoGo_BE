import { IsString, IsNotEmpty, Length, IsNumber, IsOptional, IsUUID, IsDate, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Địa chỉ chi tiết',
    example: '123 Đường ABC, Phường XYZ',
  })
  address: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Quận/Huyện',
    example: 'Thủ Đức',
    required: false,
  })
  district?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Phường/Xã',
    example: 'Linh Tây',
    required: false,
  })
  ward?: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  @ApiProperty({
    description: 'Thành phố',
    example: 'Hồ Chí Minh',
    required: false,
  })
  city?: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  @ApiProperty({
    description: 'Tỉnh/Thành',
    example: 'Hồ Chí Minh',
    required: false,
  })
  province?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @ApiProperty({
    description: 'Vĩ độ (nếu không cung cấp sẽ được tự động lấy từ Google Maps)',
    example: 10.762622,
    required: false,
  })
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @ApiProperty({
    description: 'Kinh độ (nếu không cung cấp sẽ được tự động lấy từ Google Maps)',
    example: 106.660172,
    required: false,
  })
  longitude?: number;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  @ApiProperty({
    description: 'Tự động lấy tọa độ từ Google Maps (mặc định: true)',
    example: true,
    required: false,
    default: true,
  })
  autoGeocode?: boolean;
}