import { ApiProperty } from '@nestjs/swagger';


export class LocationDto {
  @ApiProperty({ example: '321 Phạm Văn Đồng' })
  address: string;

  @ApiProperty({ example: 'Thủ Đức' })
  district: string;

  @ApiProperty({ example: 'Linh Tây' })
  ward: string;

  @ApiProperty({ example: 'Hồ Chí Minh' })
  city: string;

  @ApiProperty({ example: 'Hồ Chí Minh' })
  province: string;

  @ApiProperty({ example: 18.8491 })
  latitude: number;

  @ApiProperty({ example: 106.7724 })
  longitude: number;
}