import { IsUUID, IsNotEmpty, IsString, IsOptional, IsEnum, IsArray, IsNumber, Min } from 'class-validator';
import { ServicePackageStatus, ServiceConceptStatus } from 'src/constants/servicePackage.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateServicePackageDto {
  @ApiProperty({ example: 'Gói dịch vụ cơ bản' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Mô tả gói dịch vụ cơ bản', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  vendorId: string;

  @ApiProperty({ enum: ServicePackageStatus, example: ServicePackageStatus.ACTIVE, required: false })
  @IsEnum(ServicePackageStatus)
  @IsOptional()
  status?: ServicePackageStatus;

  @ApiProperty({ 
    example: ['uuid1', 'uuid2', 'uuid3'],
    description: 'List of service concept IDs to be included in this package',
    required: false,
    type: [String]
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  serviceConceptIds?: string[];
}

export class CreateServicePackageMetadataDto {
  @IsUUID()
  @IsNotEmpty()
  servicePackageId: string;

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

export class CreateServiceConceptServiceTypeDto {
  @IsUUID()
  @IsNotEmpty()
  serviceConceptId: string;

  @IsUUID()
  @IsNotEmpty()
  serviceTypeId: string;
}

export class CreateServiceTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateServiceConceptDto {
  @ApiProperty({ example: 'Chụp ảnh cưới cơ bản' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Gói chụp ảnh cưới cơ bản với 100 ảnh', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1000000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 60, description: 'Duration in minutes' })
  @IsNumber()
  @Min(0)
  duration: number;

  @ApiProperty({ enum: ServiceConceptStatus, example: ServiceConceptStatus.ACTIVE, required: false })
  @IsEnum(ServiceConceptStatus)
  @IsOptional()
  status?: ServiceConceptStatus;

  @ApiProperty({ 
    example: ['uuid1', 'uuid2'],
    description: 'List of service type IDs to be included in this concept',
    required: false,
    type: [String]
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  serviceTypeIds?: string[];
}