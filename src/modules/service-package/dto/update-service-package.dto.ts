import { PartialType } from '@nestjs/swagger';
import { CreateServicePackageDto, CreateServicePackageMetadataDto, CreateServiceConceptServiceTypeDto, CreateServiceTypeDto, CreateServiceConceptDto } from './create-service-package.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID, IsArray, IsNumber } from 'class-validator';
import { ServiceConceptStatus, ServicePackageStatus, ConceptRangeType } from 'src/constants/servicePackage.enum';
import { Transform } from 'class-transformer';

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
  @Transform(({ value }) => value === '' ? undefined : value)
  name?: string;

  @ApiProperty({
    description: 'Mô tả chi tiết về gói dịch vụ',
    example: 'Gói chụp ảnh cưới cao cấp bao gồm: 200 ảnh, 2 album, 1 video highlight',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  description?: string;

  @ApiProperty({
    description: 'Trạng thái của gói dịch vụ',
    enum: ServicePackageStatus,
    example: ServicePackageStatus.ACTIVE,
    required: false,
  })
  @IsEnum(ServicePackageStatus)
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  status?: ServicePackageStatus;
}

/**
 * DTO cho việc cập nhật metadata của gói dịch vụ
 * Kế thừa từ CreateServicePackageMetadataDto với tất cả các trường là tùy chọn
 */
export class UpdateServicePackageMetadataDto extends PartialType(CreateServicePackageMetadataDto) { }

/**
 * DTO cho việc cập nhật liên kết giữa khái niệm dịch vụ và loại dịch vụ
 * Kế thừa từ CreateServiceConceptServiceTypeDto với tất cả các trường là tùy chọn
 */
export class UpdateServiceConceptServiceTypeDto extends PartialType(CreateServiceConceptServiceTypeDto) { }

/**
 * DTO cho việc cập nhật loại dịch vụ
 * Kế thừa từ CreateServiceTypeDto với tất cả các trường là tùy chọn
 */
export class UpdateServiceTypeDto extends PartialType(CreateServiceTypeDto) { }

/**
 * DTO cho việc cập nhật khái niệm dịch vụ
 * Kế thừa từ CreateServiceConceptDto với tất cả các trường là tùy chọn
 */
export class UpdateServiceConceptDto {
  @ApiProperty({
    description: 'Tên của khái niệm dịch vụ',
    example: 'Chụp ảnh cưới ngoại cảnh',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  name?: string;

  @ApiProperty({
    description: 'Mô tả chi tiết về khái niệm dịch vụ',
    example: 'Chụp ảnh cưới tại các địa điểm ngoại cảnh đẹp',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  description?: string;

  @ApiProperty({
    description: 'Giá của khái niệm dịch vụ (VNĐ)',
    example: 5000000,
    required: false,
  })
  @IsNumber({}, { message: 'Giá phải là số' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  price?: number;

  @ApiProperty({
    description: 'Thời gian thực hiện (phút). Phải > 0 cho concept 1 ngày, phải = 0 cho concept nhiều ngày',
    example: 120,
    required: false,
  })
  @IsNumber({}, { message: 'Thời gian phải là số' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  duration?: number;

  @ApiProperty({
    description: 'Loại phạm vi của concept (1 ngày hoặc nhiều ngày)',
    enum: ConceptRangeType,
    example: ConceptRangeType.SINGLE_DAY,
    required: false,
  })
  @IsEnum(ConceptRangeType, { message: 'Loại phạm vi concept không hợp lệ' })
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  conceptRangeType?: ConceptRangeType;

  @ApiProperty({
    description: 'Số ngày concept kéo dài. Phải = 1 cho concept 1 ngày, phải >= 2 cho concept nhiều ngày',
    example: 1,
    required: false,
  })
  @IsNumber({}, { message: 'Số ngày phải là số' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  numberOfDays?: number;

  @ApiProperty({
    description: 'Trạng thái của khái niệm dịch vụ',
    enum: ServiceConceptStatus,
    example: ServiceConceptStatus.ACTIVE,
    required: false,
    default: ServiceConceptStatus.ACTIVE,
  })
  @IsEnum(ServiceConceptStatus)
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  status?: ServiceConceptStatus;

  @ApiProperty({
    description: 'Danh sách ID của các loại dịch vụ trong khái niệm',
    example: ['123e4567-e89b-12d3-a456-426614174003', '123e4567-e89b-12d3-a456-426614174004'],
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'string') {
      const ids = value.split(',').map(id => id.trim()).filter(id => id !== '');
      return ids.length > 0 ? ids : undefined;
    }
    return value;
  })
  @IsArray({ message: 'Danh sách loại dịch vụ phải là một mảng' })
  @IsUUID('4', { each: true, message: 'ID loại dịch vụ không hợp lệ' })
  serviceTypeIds?: string[];

  @ApiProperty({
    description: 'ID của gói dịch vụ mà khái niệm này thuộc về',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  servicePackageId?: string;

  @ApiProperty({
    description: 'Danh sách URL ảnh của concept',
    example: [
      'https://res.cloudinary.com/dodtzdovx/image/upload/v1747502672/service-concepts/images/stfchqa76gxrg2zave54.png',
      'https://res.cloudinary.com/dodtzdovx/image/upload/v1747502672/service-concepts/images/another.png'
    ],
    required: false,
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({
    description: 'Có thay thế toàn bộ ảnh hay không. true = xóa tất cả ảnh cũ và thay bằng ảnh mới, false = thêm ảnh mới vào ảnh hiện tại',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return false;
    return value === 'true' || value === true;
  })
  replaceAllImages?: boolean;

  @ApiProperty({
    description: 'Danh sách ID của những ảnh cần xóa (chỉ có hiệu lực khi replaceAllImages = false)',
    example: ['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'string') {
      const ids = value.split(',').map(id => id.trim()).filter(id => id !== '');
      return ids.length > 0 ? ids : undefined;
    }
    return value;
  })
  @IsArray({ message: 'Danh sách ID ảnh cần xóa phải là một mảng' })
  @IsUUID('4', { each: true, message: 'ID ảnh không hợp lệ' })
  @IsOptional()
  imagesToDelete?: string[];
}