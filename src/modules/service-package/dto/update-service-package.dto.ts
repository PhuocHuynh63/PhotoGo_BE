import { PartialType } from '@nestjs/swagger';
import { CreateServicePackageDto, CreateServicePackageMetadataDto, CreateServicePackagePriceOverrideDto, CreateServicePackageServiceTypeDto, CreateServiceTypeDto } from './create-service-package.dto';

export class UpdateServicePackageDto extends PartialType(CreateServicePackageDto) {}
export class UpdateServicePackageMetadataDto extends PartialType(CreateServicePackageMetadataDto) {}
export class UpdateServicePackageServiceTypeDto extends PartialType(CreateServicePackageServiceTypeDto) {}
export class UpdateServicePackagePriceOverrideDto extends PartialType(CreateServicePackagePriceOverrideDto) {}
export class UpdateServiceTypeDto extends PartialType(CreateServiceTypeDto) {}