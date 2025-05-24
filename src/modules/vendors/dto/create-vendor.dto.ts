import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, Length, IsArray, ValidateNested , IsUUID, IsDate, IsBoolean} from 'class-validator';
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';
import { VendorStatus } from 'src/constants/vendor.enum';
import { CreateLocationDto } from '../../locations/dto/create-location.dto';
import { Logger } from '@nestjs/common';

import { VendorManagerRole } from '../../../constants/vendor.enum';
export class CreateVendorDto {
  private readonly logger = new Logger(CreateVendorDto.name);

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Tên nhà cung cấp (ví dụ: Studio Ánh Sáng)',
    example: 'Vendor Name',
  })
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'uuid_of_category',
    description: 'ID danh mục của nhà cung cấp',
  })
  category_id: string;

  // @IsString()
  // @IsNotEmpty()
  // @ApiProperty({
  //   example: 'studio-anh-sang',
  //   description: 'Slug của nhà cung cấp',
  // })
  // slug: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'uuid_of_user',
    description: 'ID người dùng của nhà cung cấp',
  })
  user_id: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'Studio chụp ảnh chuyên nghiệp với thiết bị hiện đại',
    description: 'Mô tả của nhà cung cấp',
    required: false,
  })
  description?: string;

  @IsEnum(VendorStatus)
  @IsOptional()
  @ApiProperty({
    enum: VendorStatus,
    description: 'Trạng thái của nhà cung cấp',
    example: VendorStatus.ACTIVE,
    required: false,
  })
  status?: VendorStatus;

  @IsArray()
  @ValidateNested({ each: true, message: 'Mỗi vị trí phải hợp lệ' })
  @Type(() => CreateLocationDto)
  @Transform(({ value }) => {
    const logger = new Logger('CreateVendorDto');
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
          const location = new CreateLocationDto();
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
  locations: CreateLocationDto[];
}


export class CreateVendorManagerDto {
  @IsUUID()
  @IsNotEmpty()
  vendorId: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsEnum(VendorManagerRole)
  @IsNotEmpty()
  role: VendorManagerRole;
}

export class CreateVendorLikeDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  @IsNotEmpty()
  vendorId: string;
}

export class CreateVendorAvailabilityDto {
  @IsUUID()
  @IsNotEmpty()
  vendorId: string;

  @IsDate()
  @IsNotEmpty()
  date: Date;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}