import { IsUUID, IsNotEmpty, IsString, IsOptional, IsEnum, IsArray, IsNumber, Min, IsBoolean } from 'class-validator';
import { ServicePackageStatus, ServiceConceptStatus, ConceptRangeType } from 'src/constants/servicePackage.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ServiceTypeStatus } from 'src/constants/serviceType.enum';

export class CreateServiceConceptDto {
  @ApiProperty({
    description: 'Tên của khái niệm dịch vụ',
    example: 'Chụp ảnh cưới ngoại cảnh',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Mô tả chi tiết về khái niệm dịch vụ',
    example: 'Chụp ảnh cưới tại các địa điểm ngoại cảnh đẹp',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Giá của khái niệm dịch vụ (VNĐ)',
    example: 5000000,
  })
  @IsNumber({}, { message: 'Giá phải là số' })
  @Min(0, { message: 'Giá phải lớn hơn hoặc bằng 0' })
  @IsOptional()
  price?: number;

  @ApiProperty({
    description: 'Loại phạm vi của concept (1 ngày hoặc nhiều ngày)',
    enum: ConceptRangeType,
    example: ConceptRangeType.SINGLE_DAY,
    required: false,
  })
  @IsEnum(ConceptRangeType, { message: 'Loại phạm vi concept không hợp lệ' })
  @IsOptional()
  conceptRangeType?: ConceptRangeType;

  @ApiProperty({
    description: 'Thời gian thực hiện (phút). Phải > 0 cho concept 1 ngày, phải = 0 cho concept nhiều ngày',
    example: 120,
  })
  @IsNumber({}, { message: 'Thời gian phải là số' })
  @IsOptional()
  duration?: number;

  @ApiProperty({
    description: 'Số ngày concept kéo dài. Phải = 1 cho concept 1 ngày, phải >= 2 cho concept nhiều ngày',
    example: 1,
    required: false,
  })
  @IsNumber({}, { message: 'Số ngày phải là số' })
  @IsOptional()
  numberOfDays?: number;

  @ApiProperty({
    description: 'Trạng thái của khái niệm dịch vụ',
    enum: ServiceConceptStatus,
    example: ServiceConceptStatus.ACTIVE,
    required: false,
  })
  @IsEnum(ServiceConceptStatus, { message: 'Trạng thái không hợp lệ' })
  @IsOptional()
  status?: ServiceConceptStatus;

  @ApiProperty({
    description: 'Danh sách ID của các loại dịch vụ trong khái niệm',
    example: ['123e4567-e89b-12d3-a456-426614174003', '123e4567-e89b-12d3-a456-426614174004'],
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(id => id.trim());
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
  @IsUUID('4', { message: 'ID gói dịch vụ không hợp lệ' })
  @IsOptional()
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
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class CreateServicePackageDto {
  @ApiProperty({
    description: 'Tên của gói dịch vụ',
    example: 'Gói chụp ảnh cưới cao cấp',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên gói dịch vụ không được để trống' })
  name: string;

  @ApiProperty({
    description: 'Mô tả chi tiết về gói dịch vụ',
    example: 'Gói chụp ảnh cưới cao cấp bao gồm: 200 ảnh, 2 album, 1 video highlight',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'ID của nhà cung cấp dịch vụ',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty({ message: 'ID nhà cung cấp không được để trống' })
  vendorId: string;

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

export class CreateServicePackageMetadataDto {
  @ApiProperty({
    example: 'uuid',
    description: 'ID của gói dịch vụ'
  })
  @IsUUID()
  @IsNotEmpty({ message: 'ID gói dịch vụ không được để trống' })
  servicePackageId: string;

  @ApiProperty({
    example: 'key_name',
    description: 'Tên của metadata'
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên metadata không được để trống' })
  key: string;

  @ApiProperty({
    example: 'value',
    description: 'Giá trị của metadata'
  })
  @IsString()
  @IsNotEmpty({ message: 'Giá trị metadata không được để trống' })
  value: string;
}

export class CreateServiceConceptServiceTypeDto {
  @ApiProperty({
    example: 'uuid',
    description: 'ID của khái niệm dịch vụ'
  })
  @IsUUID()
  @IsNotEmpty({ message: 'ID khái niệm dịch vụ không được để trống' })
  serviceConceptId: string;

  @ApiProperty({
    example: 'uuid',
    description: 'ID của loại dịch vụ'
  })
  @IsUUID()
  @IsNotEmpty({ message: 'ID loại dịch vụ không được để trống' })
  serviceTypeId: string;
}

export class CreateServiceTypeDto {
  @ApiProperty({
    example: 'Chụp ảnh cưới',
    description: 'Tên của loại dịch vụ'
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên loại dịch vụ không được để trống' })
  name: string;

  @ApiProperty({
    example: 'Dịch vụ chụp ảnh cưới chuyên nghiệp',
    description: 'Mô tả chi tiết về loại dịch vụ',
    required: false
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'active',
    description: 'Trạng thái của loại dịch vụ',
    enum: ServiceTypeStatus,  
    required: false
  })
  @IsEnum(ServiceTypeStatus)
  @IsOptional()
  status?: ServiceTypeStatus;
}