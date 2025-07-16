import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, Length, IsArray, ValidateNested , IsUUID, IsDate, IsBoolean, IsNumber, Min, Max} from 'class-validator';
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';
import { VendorStatus } from 'src/constants/vendor.enum';
import { CreateLocationDto } from '../../locations/dto/create-location.dto';
import { Logger } from '@nestjs/common';

import { VendorManagerRole } from '../../../constants/vendor.enum';
export class CreateVendorDto {
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
  @Type(() => CreateLocationDto)
  @Transform(({ value }) => {
    const logger = new Logger('CreateVendorDto');
    logger.log(`Raw location value: ${value}`);

    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        logger.log(`Parsed location before transform: ${JSON.stringify(parsed)}`);
        const location = new CreateLocationDto();
        location.address = parsed.address;
        location.district = parsed.district;
        location.ward = parsed.ward;
        location.city = parsed.city;
        location.province = parsed.province;
        // Latitude và longitude sẽ được tự động lấy từ Google Maps nếu không cung cấp
        location.latitude = parsed.latitude;
        location.longitude = parsed.longitude;
        location.autoGeocode = parsed.autoGeocode !== false; // default to true
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
    description: 'Thông tin vị trí (có thể cung cấp tọa độ thủ công hoặc để tự động lấy từ Google Maps)',
    example: '{"address":"321 Phạm Văn Đồng","district":"Thủ Đức","ward":"Linh Tây","city":"Hồ Chí Minh","province":"Hồ Chí Minh","latitude":10.762622,"longitude":106.660172}',
    required: false,
  })
  location?: CreateLocationDto;
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