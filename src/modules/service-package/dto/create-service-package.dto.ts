import { IsUUID, IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max, IsEnum, IsDate } from 'class-validator';
import { ServicePackageStatus } from 'src/constants/servicePackage.enum';

export class CreateServicePackageDto {
  @IsUUID()
  @IsNotEmpty()
  vendorId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;

  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  duration: number; // Duration in minutes

  @IsEnum(ServicePackageStatus)
  @IsOptional()
  status?: ServicePackageStatus;
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

export class CreateServicePackageServiceTypeDto {
  @IsUUID()
  @IsNotEmpty()
  servicePackageId: string;

  @IsUUID()
  @IsNotEmpty()
  serviceTypeId: string;
}

export class CreateServicePackagePriceOverrideDto {
  @IsUUID()
  @IsNotEmpty()
  servicePackageId: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  overridePrice: number;

  @IsDate()
  @IsNotEmpty()
  startDate: Date;

  @IsDate()
  @IsNotEmpty()
  endDate: Date;
}

export class CreateServiceTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}