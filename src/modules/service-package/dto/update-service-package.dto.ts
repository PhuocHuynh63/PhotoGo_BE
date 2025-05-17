import { PartialType } from '@nestjs/swagger';
import { CreateServicePackageDto, CreateServicePackageMetadataDto, CreateServiceConceptServiceTypeDto, CreateServiceTypeDto, CreateServiceConceptDto } from './create-service-package.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ServicePackageStatus } from 'src/constants/servicePackage.enum';

/**
 * DTO cho việc cập nhật gói dịch vụ
 * Kế thừa từ CreateServicePackageDto với tất cả các trường là tùy chọn
 */
export class UpdateServicePackageDto {
  @ApiProperty({
    description: 'Tên của gói dịch vụ',
    example: 'Gói chụp ảnh cưới cao cấp',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Mô tả chi tiết về gói dịch vụ',
    example: 'Gói chụp ảnh cưới cao cấp bao gồm: 200 ảnh, 2 album, 1 video highlight',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Trạng thái của gói dịch vụ',
    enum: ServicePackageStatus,
    example: ServicePackageStatus.ACTIVE,
    required: false,
  })
  @IsEnum(ServicePackageStatus)
  @IsOptional()
  status?: ServicePackageStatus;
}

/**
 * DTO cho việc cập nhật metadata của gói dịch vụ
 * Kế thừa từ CreateServicePackageMetadataDto với tất cả các trường là tùy chọn
 */
export class UpdateServicePackageMetadataDto extends PartialType(CreateServicePackageMetadataDto) {}

/**
 * DTO cho việc cập nhật liên kết giữa khái niệm dịch vụ và loại dịch vụ
 * Kế thừa từ CreateServiceConceptServiceTypeDto với tất cả các trường là tùy chọn
 */
export class UpdateServiceConceptServiceTypeDto extends PartialType(CreateServiceConceptServiceTypeDto) {}

/**
 * DTO cho việc cập nhật loại dịch vụ
 * Kế thừa từ CreateServiceTypeDto với tất cả các trường là tùy chọn
 */
export class UpdateServiceTypeDto extends PartialType(CreateServiceTypeDto) {}

/**
 * DTO cho việc cập nhật khái niệm dịch vụ
 * Kế thừa từ CreateServiceConceptDto với tất cả các trường là tùy chọn
 */
export class UpdateServiceConceptDto extends PartialType(CreateServiceConceptDto) {}