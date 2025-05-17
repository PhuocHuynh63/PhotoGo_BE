import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServicePackage } from './entities/service-package.entity';
import { ServicePackageMetadata } from './entities/service-package-metadata.entity';
import { ServiceConceptServiceType } from './entities/service-concept-service-type.entity';
import { ServiceType } from './entities/service-type.entity';
import { ServiceConcept } from './entities/service-concept.entity';
import { CreateServicePackageDto, CreateServicePackageMetadataDto, CreateServiceConceptServiceTypeDto, CreateServiceTypeDto, CreateServiceConceptDto } from './dto/create-service-package.dto';
import { UpdateServicePackageDto, UpdateServicePackageMetadataDto, UpdateServiceConceptServiceTypeDto, UpdateServiceTypeDto, UpdateServiceConceptDto } from './dto/update-service-package.dto';
import { UploadService } from 'src/3rdService/upload/upload.service';

@Injectable()
export class ServicePackageService {
  private readonly logger = new Logger(ServicePackageService.name);

  constructor(
    @InjectRepository(ServicePackage)
    private readonly servicePackageRepository: Repository<ServicePackage>,
    @InjectRepository(ServicePackageMetadata)
    private readonly servicePackageMetadataRepository: Repository<ServicePackageMetadata>,
    @InjectRepository(ServiceConceptServiceType)
    private readonly serviceConceptServiceTypeRepository: Repository<ServiceConceptServiceType>,
    @InjectRepository(ServiceType)
    private readonly serviceTypeRepository: Repository<ServiceType>,
    @InjectRepository(ServiceConcept)
    private readonly serviceConceptRepository: Repository<ServiceConcept>,
    private readonly uploadService: UploadService,
  ) {}

  async create(
    createServicePackageDto: CreateServicePackageDto,
    files: { logo?: Express.Multer.File },
  ): Promise<ServicePackage> {
    const startTime = Date.now();
    this.logger.log('Tạo gói dịch vụ');

    const servicePackageData: Partial<ServicePackage> = {
      name: createServicePackageDto.name,
      description: createServicePackageDto.description,
      vendorId: createServicePackageDto.vendorId,
      status: createServicePackageDto.status,
    };

    // Upload image if provided
    if (files.logo) {
      this.logger.log('Tải lên ảnh');
      try {
        const uploadResult = await this.uploadService.uploadImage(files.logo, 'service-packages/images');
        servicePackageData.image = uploadResult;
      } catch (error) {
        this.logger.error(`Lỗi tải lên ảnh: ${error.message}`);
        throw new BadRequestException(`Lỗi tải lên ảnh: ${error.message}`);
      }
    }

    // Create the service package first
    const servicePackage = this.servicePackageRepository.create(servicePackageData);
    const savedServicePackage = await this.servicePackageRepository.save(servicePackage);

    // If service concept IDs are provided, link them to the package
    if (createServicePackageDto.serviceConceptIds && createServicePackageDto.serviceConceptIds.length > 0) {
      this.logger.log('Liên kết khái niệm dịch vụ với gói dịch vụ');
      try {
        // Verify all service concepts exist
        const serviceConcepts = await this.serviceConceptRepository.findByIds(createServicePackageDto.serviceConceptIds);
        if (serviceConcepts.length !== createServicePackageDto.serviceConceptIds.length) {
          throw new NotFoundException('Một hoặc nhiều khái niệm dịch vụ không tồn tại');
        }

        // Update each service concept to link to this package
        for (const serviceConcept of serviceConcepts) {
          serviceConcept.servicePackage = savedServicePackage;
          await this.serviceConceptRepository.save(serviceConcept);
        }
      } catch (error) {
        this.logger.error(`Lỗi liên kết khái niệm dịch vụ: ${error.message}`);
        throw error;
      }
    }

    this.logger.log(`Gói dịch vụ đã được tạo thành công trong ${Date.now() - startTime}ms`);
    
    // Return the package with its service concepts
    return this.servicePackageRepository.findOne({
      where: { id: savedServicePackage.id },
      relations: ['serviceConcepts'],
    });
  }

  async findAll(): Promise<ServicePackage[]> {
    return this.servicePackageRepository.find({ 
      relations: ['vendor', 'serviceConcepts'] 
    });
  }

  async findOne(id: string): Promise<ServicePackage> {
    const servicePackage = await this.servicePackageRepository.findOne({
      where: { id },
      relations: ['vendor', 'serviceConcepts'],
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

  //#region ServiceConceptServiceType
  async createServiceConceptServiceType(dto: CreateServiceConceptServiceTypeDto): Promise<ServiceConceptServiceType> {
    const serviceType = this.serviceConceptServiceTypeRepository.create(dto);
    return this.serviceConceptServiceTypeRepository.save(serviceType);
  }

  async findAllServiceConceptServiceType(): Promise<ServiceConceptServiceType[]> {
    return this.serviceConceptServiceTypeRepository.find({ relations: ['serviceConcept'] });
  }

  async findServiceConceptServiceType(serviceConceptId: string, serviceTypeId: string): Promise<ServiceConceptServiceType> {
    const serviceType = await this.serviceConceptServiceTypeRepository.findOne({
      where: { serviceConceptId, serviceTypeId },
      relations: ['serviceConcept'],
    });
    if (!serviceType) {
      throw new NotFoundException(`Loại dịch vụ gói dịch vụ với ID ${serviceConceptId} và ${serviceTypeId} không tồn tại`);
    }
    return serviceType;
  }

  async updateServiceConceptServiceType(serviceConceptId: string, serviceTypeId: string, dto: UpdateServiceConceptServiceTypeDto): Promise<ServiceConceptServiceType> {
    const serviceConceptServiceType = await this.findServiceConceptServiceType(serviceConceptId, serviceTypeId);
    Object.assign(serviceConceptServiceType, dto);
    return this.serviceConceptServiceTypeRepository.save(serviceConceptServiceType);
  }

  async removeServiceConceptServiceType(serviceConceptId: string, serviceTypeId: string): Promise<void> {
    const serviceConceptServiceType = await this.findServiceConceptServiceType(serviceConceptId, serviceTypeId);
    await this.serviceConceptServiceTypeRepository.remove(serviceConceptServiceType);
  }
  //#endregion ServiceConceptServiceType

  //#region ServiceType
  async createServiceType(dto: CreateServiceTypeDto): Promise<ServiceType> {
    const serviceType = this.serviceTypeRepository.create(dto);
    return this.serviceTypeRepository.save(serviceType);
  }

  async findAllServiceTypes(): Promise<ServiceType[]> {
    return this.serviceTypeRepository.find({ relations: ['serviceConceptServiceTypes'] });
  }

  async findServiceType(id: string): Promise<ServiceType> {
    const serviceType = await this.serviceTypeRepository.findOne({
      where: { id },
      relations: ['serviceConceptServiceTypes'],
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

  //#region ServiceConcept
  async createServiceConcept(
    createServiceConceptDto: CreateServiceConceptDto,
    files: { image?: Express.Multer.File },
  ): Promise<ServiceConcept> {
    const startTime = Date.now();
    this.logger.log('Tạo khái niệm dịch vụ');

    const serviceConceptData: Partial<ServiceConcept> = {
      name: createServiceConceptDto.name,
      description: createServiceConceptDto.description,
      price: createServiceConceptDto.price,
      duration: createServiceConceptDto.duration,
      status: createServiceConceptDto.status,
    };

    // Upload image if provided
    if (files.image) {
      this.logger.log('Tải lên ảnh');
      try {
        const uploadResult = await this.uploadService.uploadImage(files.image, 'service-concepts/images');
        serviceConceptData.image = uploadResult;
      } catch (error) {
        this.logger.error(`Lỗi tải lên ảnh: ${error.message}`);
        throw new BadRequestException(`Lỗi tải lên ảnh: ${error.message}`);
      }
    }

    // Create the service concept first
    const serviceConcept = this.serviceConceptRepository.create(serviceConceptData);
    const savedServiceConcept = await this.serviceConceptRepository.save(serviceConcept);

    // If service type IDs are provided, link them to the concept
    if (createServiceConceptDto.serviceTypeIds && createServiceConceptDto.serviceTypeIds.length > 0) {
      this.logger.log('Liên kết loại dịch vụ với khái niệm dịch vụ');
      try {
        // Verify all service types exist
        const serviceTypes = await this.serviceTypeRepository.findByIds(createServiceConceptDto.serviceTypeIds);
        if (serviceTypes.length !== createServiceConceptDto.serviceTypeIds.length) {
          throw new NotFoundException('Một hoặc nhiều loại dịch vụ không tồn tại');
        }

        // Create service concept service type relationships
        for (const serviceType of serviceTypes) {
          const serviceConceptServiceType = this.serviceConceptServiceTypeRepository.create({
            serviceConceptId: savedServiceConcept.id,
            serviceTypeId: serviceType.id,
          });
          await this.serviceConceptServiceTypeRepository.save(serviceConceptServiceType);
        }
      } catch (error) {
        this.logger.error(`Lỗi liên kết loại dịch vụ: ${error.message}`);
        throw error;
      }
    }

    this.logger.log(`Khái niệm dịch vụ đã được tạo thành công trong ${Date.now() - startTime}ms`);
    
    // Return the concept with its service types
    return this.serviceConceptRepository.findOne({
      where: { id: savedServiceConcept.id },
      relations: ['serviceConceptServiceTypes', 'serviceConceptServiceTypes.serviceType'],
    });
  }

  async findAllServiceConcepts(): Promise<ServiceConcept[]> {
    return this.serviceConceptRepository.find({
      relations: ['serviceConceptServiceTypes', 'serviceConceptServiceTypes.serviceType'],
    });
  }

  async findServiceConcept(id: string): Promise<ServiceConcept> {
    const serviceConcept = await this.serviceConceptRepository.findOne({
      where: { id },
      relations: ['serviceConceptServiceTypes', 'serviceConceptServiceTypes.serviceType'],
    });
    if (!serviceConcept) {
      throw new NotFoundException(`Khái niệm dịch vụ với ID ${id} không tồn tại`);
    }
    return serviceConcept;
  }

  async updateServiceConcept(
    id: string,
    updateServiceConceptDto: UpdateServiceConceptDto,
    files: { image?: Express.Multer.File },
  ): Promise<ServiceConcept> {
    const serviceConcept = await this.findServiceConcept(id);

    // Update basic fields
    if (updateServiceConceptDto.name) serviceConcept.name = updateServiceConceptDto.name;
    if (updateServiceConceptDto.description !== undefined) serviceConcept.description = updateServiceConceptDto.description;
    if (updateServiceConceptDto.price !== undefined) serviceConcept.price = updateServiceConceptDto.price;
    if (updateServiceConceptDto.duration !== undefined) serviceConcept.duration = updateServiceConceptDto.duration;
    if (updateServiceConceptDto.status !== undefined) serviceConcept.status = updateServiceConceptDto.status;

    // Upload new image if provided
    if (files.image) {
      this.logger.log('Tải lên ảnh mới');
      try {
        const uploadResult = await this.uploadService.uploadImage(files.image, 'service-concepts/images');
        serviceConcept.image = uploadResult;
      } catch (error) {
        this.logger.error(`Lỗi tải lên ảnh: ${error.message}`);
        throw new BadRequestException(`Lỗi tải lên ảnh: ${error.message}`);
      }
    }

    // Update service types if provided
    if (updateServiceConceptDto.serviceTypeIds) {
      this.logger.log('Cập nhật liên kết loại dịch vụ');
      try {
        // Remove existing relationships
        await this.serviceConceptServiceTypeRepository.delete({ serviceConceptId: id });

        // Verify all service types exist
        const serviceTypes = await this.serviceTypeRepository.findByIds(updateServiceConceptDto.serviceTypeIds);
        if (serviceTypes.length !== updateServiceConceptDto.serviceTypeIds.length) {
          throw new NotFoundException('Một hoặc nhiều loại dịch vụ không tồn tại');
        }

        // Create new relationships
        for (const serviceType of serviceTypes) {
          const serviceConceptServiceType = this.serviceConceptServiceTypeRepository.create({
            serviceConceptId: id,
            serviceTypeId: serviceType.id,
          });
          await this.serviceConceptServiceTypeRepository.save(serviceConceptServiceType);
        }
      } catch (error) {
        this.logger.error(`Lỗi cập nhật liên kết loại dịch vụ: ${error.message}`);
        throw error;
      }
    }

    const updatedServiceConcept = await this.serviceConceptRepository.save(serviceConcept);
    return this.findServiceConcept(updatedServiceConcept.id);
  }

  async removeServiceConcept(id: string): Promise<void> {
    const serviceConcept = await this.findServiceConcept(id);
    await this.serviceConceptRepository.remove(serviceConcept);
  }
  //#endregion ServiceConcept
}