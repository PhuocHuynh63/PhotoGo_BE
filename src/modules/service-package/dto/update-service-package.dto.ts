import { PartialType } from '@nestjs/swagger';
import { CreateServicePackageDto, CreateServicePackageMetadataDto, CreateServiceConceptServiceTypeDto, CreateServiceTypeDto, CreateServiceConceptDto } from './create-service-package.dto';

export class UpdateServicePackageDto extends PartialType(CreateServicePackageDto) {}
export class UpdateServicePackageMetadataDto extends PartialType(CreateServicePackageMetadataDto) {}
export class UpdateServiceConceptServiceTypeDto extends PartialType(CreateServiceConceptServiceTypeDto) {}
export class UpdateServiceTypeDto extends PartialType(CreateServiceTypeDto) {}
export class UpdateServiceConceptDto extends PartialType(CreateServiceConceptDto) {}