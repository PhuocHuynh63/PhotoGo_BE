import { IsOptional, IsArray, ValidateNested, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';
import { Logger } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { VendorStatus } from 'src/constants/vendor.enum';
import { CreateLocationDto } from '../../locations/dto/create-location.dto';
import { UpdateLocationDto } from 'src/modules/locations/dto/update-location.dto';

export class UpdateVendorDto {
  private readonly logger = new Logger(UpdateVendorDto.name);

  @IsOptional()
  @ApiProperty({
    description: 'Tên nhà cung cấp',
    example: 'Nhà cung cấp 1',
  })
    name?: string;
  
  @IsOptional()
  @ApiProperty({
    description: 'Mô tả nhà cung cấp',
    example: 'Mô tả nhà cung cấp 1',
  })
    description?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'ID danh mục của nhà cung cấp',
    example: 'uuid_of_category',
  })
    category_id?: string;

  @IsOptional()
  @ApiProperty({
    description: 'ID người dùng của nhà cung cấp',
    example: 'uuid_of_user',
  })
    user_id?: string;
  
  @IsOptional()
  @ApiProperty({
    description: 'Trạng thái nhà cung cấp',
    example: VendorStatus.ACTIVE,
  })
    status?: VendorStatus;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(10)
  @Type(() => Number)
  @ApiProperty({
    description: 'Độ ưu tiên của nhà cung cấp (0-10)',
    example: 5,
    required: false,
  })
  priority?: number;

  @ValidateNested()
  @Type(() => UpdateLocationDto)
  @Transform(({ value }) => {
    const logger = new Logger('UpdateVendorDTO');
    logger.log(`Raw location value: ${value}`);

    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        logger.log(`Parsed location before transform: ${JSON.stringify(parsed)}`);
        const location = new UpdateLocationDto();
        location.address = parsed.address;
        location.district = parsed.district;
        location.ward = parsed.ward;
        location.city = parsed.city;
        location.province = parsed.province;
        location.latitude = parsed.latitude;
        location.longitude = parsed.longitude;
        location.id = parsed.id;
        logger.log(`Transformed location: ${JSON.stringify(location)}`);
        return location;
      } catch (e) {
        logger.error(`Failed to parse location: ${e.message}`);
        throw new Error(`location phải là một object JSON hợp lệ: ${e.message}`);
      }
    }

    logger.log(`Parsed location (non-string): ${JSON.stringify(value)}`);
    return value;
  })
  @ApiProperty({
    type: 'string',
    description: 'Một chuỗi JSON biểu diễn thông tin vị trí',
    example: '{"id":"location-id","address":"321 Phạm Văn Đồng","district":"Thủ Đức","ward":"Linh Tây","city":"Hồ Chí Minh","province":"Hồ Chí Minh","latitude":18.8491,"longitude":106.7724}',
    required: false,
  })
  location?: UpdateLocationDto;
}
  