import { IsOptional, IsArray, ValidateNested } from 'class-validator';
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
  @ApiProperty({
    description: 'Trạng thái nhà cung cấp',
    example: VendorStatus.ACTIVE,
  })
    status?: VendorStatus;

    @IsArray()
    @ValidateNested({ each: true, message: 'Mỗi vị trí phải hợp lệ' })
    @Type(() => UpdateLocationDto)
    @Transform(({ value }) => {
      const logger = new Logger('UpdateVendorDTO');
      logger.log(`Raw locations value: ${value}`);
  
      if (!value) {
        return [];
      }
  
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed)) {
            throw new Error('locations phải là một mảng');
          }
          logger.log(`Parsed locations before transform: ${JSON.stringify(parsed)}`);
          const transformed = parsed.map((item: any) => {
            const location = new UpdateLocationDto();
            location.address = item.address;
            location.district = item.district;
            location.ward = item.ward;
            location.city = item.city;
            location.province = item.province;
            location.latitude = item.latitude;
            location.longitude = item.longitude;
            return location;
          });
          logger.log(`Transformed locations: ${JSON.stringify(transformed)}`);
          return transformed;
        } catch (e) {
          logger.error(`Failed to parse locations: ${e.message}`);
          throw new Error(`locations phải là một mảng JSON hợp lệ: ${e.message}`);
        }
      }
  
      logger.log(`Parsed locations (non-string): ${JSON.stringify(value)}`);
      return value;
    })
    @ApiProperty({
      type: 'string',
      description: 'Một chuỗi JSON biểu diễn một mảng vị trí',
      example: '[{"address":"321 Phạm Văn Đồng","district":"Thủ Đức","ward":"Linh Tây","city":"Hồ Chí Minh","province":"Hồ Chí Minh","latitude":18.8491,"longitude":106.7724},{"address":"456 Lê Văn Việt","district":"Thủ Đức","ward":"Tăng Nhơn Phú A","city":"Hồ Chí Minh","province":"Hồ Chí Minh","latitude":18.8432,"longitude":106.7793}]',
    })
    locations: UpdateLocationDto[];
  }
  