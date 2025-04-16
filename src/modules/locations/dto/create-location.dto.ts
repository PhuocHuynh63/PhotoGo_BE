import { IsString, IsNotEmpty, Length, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '321 Phạm Văn Đồng',
    description: 'Address of the location',
  })
  address: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Thủ Đức',
    description: 'District of the location',
  })
  district: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Linh Tây',
    description: 'Ward of the location',
  })
  ward: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @ApiProperty({
    example: 'Hồ Chí Minh',
    description: 'City of the location',
  })
  city: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @ApiProperty({
    example: 'Hồ Chí Minh',
    description: 'Province of the location',
  })
  province: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    example: 10.849100,
    description: 'Latitude of the location',
    required: false,
  })
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    example: 106.772400,
    description: 'Longitude of the location',
    required: false,
  })
  longitude?: number;

}