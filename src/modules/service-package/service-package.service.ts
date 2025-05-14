import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServicePackage } from './entities/service-package.entity';
import { ServicePackageMetadata } from './entities/service-package-metadata.entity';
import { ServicePackagePriceOverride } from './entities/service-package-price-override.entity';
import { ServicePackageServiceType } from './entities/service-package-service-type.entity';
import { ServiceType } from './entities/service-type.entity';
import { CreateServicePackageDto, CreateServicePackageMetadataDto, CreateServicePackagePriceOverrideDto, CreateServicePackageServiceTypeDto, CreateServiceTypeDto } from './dto/create-service-package.dto';
import { UpdateServicePackageDto, UpdateServicePackageMetadataDto, UpdateServicePackagePriceOverrideDto, UpdateServicePackageServiceTypeDto, UpdateServiceTypeDto } from './dto/update-service-package.dto';

@Injectable()
export class ServicePackageService {
  constructor(
    @InjectRepository(ServicePackage)
    private readonly servicePackageRepository: Repository<ServicePackage>,
    @InjectRepository(ServicePackageMetadata)
    private readonly servicePackageMetadataRepository: Repository<ServicePackageMetadata>,
    @InjectRepository(ServicePackagePriceOverride)
    private readonly servicePackagePriceOverrideRepository: Repository<ServicePackagePriceOverride>,
    @InjectRepository(ServicePackageServiceType)
    private readonly servicePackageServiceTypeRepository: Repository<ServicePackageServiceType>,
    @InjectRepository(ServiceType)
    private readonly serviceTypeRepository: Repository<ServiceType>,
  ) {}

  async create(createServicePackageDto: CreateServicePackageDto): Promise<ServicePackage> {
    const servicePackage = this.servicePackageRepository.create(createServicePackageDto);
    return this.servicePackageRepository.save(servicePackage);
  }

  async findAll(): Promise<ServicePackage[]> {
    return this.servicePackageRepository.find({ relations: ['vendor'] });
  }

  async findOne(id: string): Promise<ServicePackage> {
    const servicePackage = await this.servicePackageRepository.findOne({
      where: { id },
      relations: ['vendor'],
    });
    if (!servicePackage) {
      throw new NotFoundException(`Gói dịch vụ với ID ${id} không tồn tại`);
    }
    return servicePackage;
  }

  async update(id: string, updateServicePackageDto: UpdateServicePackageDto): Promise<ServicePackage> {
    const servicePackage = await this.findOne(id);
    Object.assign(servicePackage, updateServicePackageDto);
    return this.servicePackageRepository.save(servicePackage);
  }

  async remove(id: string): Promise<void> {
    const servicePackage = await this.findOne(id);
    await this.servicePackageRepository.remove(servicePackage);
  }

  //#region ServicePackageMetadata
  async createMetadata(dto: CreateServicePackageMetadataDto): Promise<ServicePackageMetadata> {
    const metadata = this.servicePackageMetadataRepository.create(dto);
    return this.servicePackageMetadataRepository.save(metadata);
  }

  async findAllMetadata(): Promise<ServicePackageMetadata[]> {
    return this.servicePackageMetadataRepository.find({ relations: ['servicePackage'] });
  }

  async findMetadata(id: string): Promise<ServicePackageMetadata> {
    const metadata = await this.servicePackageMetadataRepository.findOne({
      where: { id },
      relations: ['servicePackage'],
    });
    if (!metadata) {
      throw new NotFoundException(`Metadata gói dịch vụ với ID ${id} không tồn tại`);
    }
    return metadata;
  }

  async updateMetadata(id: string, dto: UpdateServicePackageMetadataDto): Promise<ServicePackageMetadata> {
    const metadata = await this.findMetadata(id);
    Object.assign(metadata, dto);
    return this.servicePackageMetadataRepository.save(metadata);
  }

  async removeMetadata(id: string): Promise<void> {
    const metadata = await this.findMetadata(id);
    await this.servicePackageMetadataRepository.remove(metadata);
  }
  //#endregion ServicePackageMetadata

  //#region ServicePackagePriceOverride
  async createPriceOverride(dto: CreateServicePackagePriceOverrideDto): Promise<ServicePackagePriceOverride> {
    const priceOverride = this.servicePackagePriceOverrideRepository.create(dto);
    return this.servicePackagePriceOverrideRepository.save(priceOverride);
  }

  async findAllPriceOverrides(): Promise<ServicePackagePriceOverride[]> {
    return this.servicePackagePriceOverrideRepository.find({ relations: ['servicePackage'] });
  }

  async findPriceOverride(id: string): Promise<ServicePackagePriceOverride> {
    const priceOverride = await this.servicePackagePriceOverrideRepository.findOne({
      where: { id },
      relations: ['servicePackage'],
    });
    if (!priceOverride) {
      throw new NotFoundException(`Giá gói dịch vụ với ID ${id} không tồn tại`);
    }
    return priceOverride;
  }

  async updatePriceOverride(id: string, dto: UpdateServicePackagePriceOverrideDto): Promise<ServicePackagePriceOverride> {
    const priceOverride = await this.findPriceOverride(id);
    Object.assign(priceOverride, dto);
    return this.servicePackagePriceOverrideRepository.save(priceOverride);
  }

  async removePriceOverride(id: string): Promise<void> {
    const priceOverride = await this.findPriceOverride(id);
    await this.servicePackagePriceOverrideRepository.remove(priceOverride);
  }
  //#endregion ServicePackagePriceOverride

  //#region ServicePackageServiceType
  async createServicePackageServiceType(dto: CreateServicePackageServiceTypeDto): Promise<ServicePackageServiceType> {
    const serviceType = this.servicePackageServiceTypeRepository.create(dto);
    return this.servicePackageServiceTypeRepository.save(serviceType);
  }

  async findAllServicePackageServiceType(): Promise<ServicePackageServiceType[]> {
    return this.servicePackageServiceTypeRepository.find({ relations: ['servicePackage'] });
  }

  async findServicePackageServiceType(servicePackageId: string, serviceTypeId: string): Promise<ServicePackageServiceType> {
    const serviceType = await this.servicePackageServiceTypeRepository.findOne({
      where: { servicePackageId, serviceTypeId },
      relations: ['servicePackage'],
    });
    if (!serviceType) {
      throw new NotFoundException(`Loại dịch vụ gói dịch vụ với ID ${servicePackageId} và ${serviceTypeId} không tồn tại`);
    }
    return serviceType;
  }

  async updateServicePackageServiceType(servicePackageId: string, serviceTypeId: string, dto: UpdateServicePackageServiceTypeDto): Promise<ServicePackageServiceType> {
    const servicePackageServiceType = await this.findServicePackageServiceType(servicePackageId, serviceTypeId);
    Object.assign(servicePackageServiceType, dto);
    return this.servicePackageServiceTypeRepository.save(servicePackageServiceType);
  }

  async removeServicePackageServiceType(servicePackageId: string, serviceTypeId: string): Promise<void> {
    const servicePackageServiceType = await this.findServicePackageServiceType(servicePackageId, serviceTypeId);
    await this.servicePackageServiceTypeRepository.remove(servicePackageServiceType);
  }
  //#endregion ServicePackageServiceType

  //#region ServiceType
  async createServiceType(dto: CreateServiceTypeDto): Promise<ServiceType> {
    const serviceType = this.serviceTypeRepository.create(dto);
    return this.serviceTypeRepository.save(serviceType);
  }

  async findAllServiceTypes(): Promise<ServiceType[]> {
    return this.serviceTypeRepository.find({ relations: ['servicePackageServiceTypes'] });
  }

  async findServiceType(id: string): Promise<ServiceType> {
    const serviceType = await this.serviceTypeRepository.findOne({
      where: { id },
      relations: ['servicePackageServiceTypes'],
    });
    if (!serviceType) {
      throw new NotFoundException(`Loại dịch vụ với ID ${id} không tồn tại`);
    }
    return serviceType;
  }

  async updateServiceType(id: string, dto: UpdateServiceTypeDto): Promise<ServiceType> {
    const serviceType = await this.findServiceType(id);
    Object.assign(serviceType, dto);
    return this.serviceTypeRepository.save(serviceType);
  }

  async removeServiceType(id: string): Promise<void> {
    const serviceType = await this.findServiceType(id);
    await this.serviceTypeRepository.remove(serviceType);
  }
  //#endregion ServiceType
}