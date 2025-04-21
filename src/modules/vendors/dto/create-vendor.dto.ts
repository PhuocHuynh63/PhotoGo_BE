import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, Length, IsArray, ValidateNested , IsUUID, IsDate, IsBoolean} from 'class-validator';
import { Type } from 'class-transformer';
import { VendorStatus } from 'src/constants/vendor.enum';
import { CreateLocationDto } from '../../locations/dto/create-location.dto';

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

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'studio-anh-sang',
    description: 'Slug của nhà cung cấp',
  })
  slug: string;

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
  @ValidateNested({ each: true })
  @Type(() => CreateLocationDto)
  @ApiProperty({
    type: [CreateLocationDto],
    description: 'Danh sách địa điểm của nhà cung cấp',
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