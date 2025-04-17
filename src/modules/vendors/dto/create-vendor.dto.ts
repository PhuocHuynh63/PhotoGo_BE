import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, Length, IsArray, ValidateNested , IsUUID, IsDate, IsBoolean} from 'class-validator';
import { Type } from 'class-transformer';
import { VendorStatus } from 'src/constants/vendor.enum';
import { CreateLocationDto } from '../../locations/dto/create-location.dto';

import { VendorManagerRole } from '../../../constants/vendor.enum';

export class CreateVendorDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @ApiProperty({
    description: 'Studio Ánh Sáng',
    example: 'Vendor Name',
  })
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'uuid_of_category',
    description: 'Category ID of the vendor',
  })
  category_id: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'Studio chụp ảnh chuyên nghiệp với thiết bị hiện đại',
    description: 'Description of the vendor',
    required: false,
  })
  description?: string;

  @IsEnum(VendorStatus)
  @IsOptional()
  @ApiProperty({
    enum: VendorStatus,
    description: 'Status of the vendor',
    example: VendorStatus.ACTIVE,
    required: false,
  })
  status?: VendorStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLocationDto)
  @ApiProperty({
    type: [CreateLocationDto],
    description: 'List of locations for the vendor',
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