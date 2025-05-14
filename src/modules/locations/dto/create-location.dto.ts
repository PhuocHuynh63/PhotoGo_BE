import { IsString, IsNotEmpty, Length, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '321 Phạm Văn Đồng',
    description: 'Địa chỉ của vị trí',
  })
  address: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Thủ Đức',
    description: 'Quận của vị trí',
  })
  district: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Linh Tây',
    description: 'Phường của vị trí',
  })
  ward: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @ApiProperty({
    example: 'Hồ Chí Minh',
    description: 'Thành phố của vị trí',
  })
  city: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @ApiProperty({
    example: 'Hồ Chí Minh',
    description: 'Tỉnh của vị trí',
  })
  province: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    example: 10.849100,
    description: 'Vĩ độ của vị trí',
    required: false,
  })
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    example: 106.772400,
    description: 'Kinh độ của vị trí',
    required: false,
  })
  longitude?: number;

}