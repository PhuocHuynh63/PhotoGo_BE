import { IsString, IsNotEmpty, Length, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLocationDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({
    example: '97004449-52d9-4a49-b071-ce5786f7645e',
    description: 'ID của vendor',
    required: true,
    name: 'vendor_id',
    title: 'Vendor Information'
  })
  vendor_id: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '321 Phạm Văn Đồng',
    description: 'Địa chỉ của vị trí',
    required: true,
    name: 'address',
    title: 'Address Information'
  })
  address: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Thủ Đức',
    description: 'Quận của vị trí',
    required: true,
    name: 'district',
    title: 'Address Information'
  })
  district: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Linh Tây',
    description: 'Phường của vị trí',
    required: true,
    name: 'ward',
    title: 'Address Information'
  })
  ward: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @ApiProperty({
    example: 'Hồ Chí Minh',
    description: 'Thành phố của vị trí',
    required: true,
    name: 'city',
    title: 'Address Information'
  })
  city: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @ApiProperty({
    example: 'Hồ Chí Minh',
    description: 'Tỉnh của vị trí',
    required: true,
    name: 'province',
    title: 'Address Information'
  })
  province: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    example: 10.849100,
    description: 'Vĩ độ của vị trí',
    required: false,
    name: 'latitude',
    title: 'Coordinates'
  })
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    example: 106.772400,
    description: 'Kinh độ của vị trí',
    required: false,
    name: 'longitude',
    title: 'Coordinates'
  })
  longitude?: number;
}