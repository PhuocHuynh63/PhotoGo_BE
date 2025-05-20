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
import { ServicePackageStatus } from 'src/constants/servicePackage.enum';
import { ServiceConceptStatus } from 'src/constants/serviceConcept.enum';

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
    files: { image?: Express.Multer.File },
  ): Promise<ServicePackage> {
    const startTime = Date.now();
    this.logger.log('Bắt đầu quá trình tạo gói dịch vụ');

    const servicePackageData: Partial<ServicePackage> = {
      name: createServicePackageDto.name,
      description: createServicePackageDto.description,
      vendorId: createServicePackageDto.vendorId,
      status: createServicePackageDto.status || ServicePackageStatus.ACTIVE,
    };

    // Upload image if provided
    if (files.image) {
      this.logger.log('Đang tải lên ảnh');
      try {
        const uploadResult = await this.uploadService.uploadImage(files.image, 'service-packages/images');
        servicePackageData.image = uploadResult;
      } catch (error) {
        this.logger.error(`Lỗi khi tải lên ảnh: ${error.message}`);
        throw new BadRequestException(`Lỗi khi tải lên ảnh: ${error.message}`);
      }
    }

    // Create the service package
    const servicePackage = this.servicePackageRepository.create(servicePackageData);
    const savedServicePackage = await this.servicePackageRepository.save(servicePackage);

    this.logger.log(`Gói dịch vụ đã được tạo thành công trong ${Date.now() - startTime}ms`);
    
    return savedServicePackage;
  }

  async findAll(query?: { current?: number; pageSize?: number }): Promise<{
    data: ServicePackage[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const currentPage = query?.current ? Number(query.current) : 1;
    const pageSize = query?.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;

    const queryBuilder = this.servicePackageRepository.createQueryBuilder('service_package');
    queryBuilder.leftJoinAndSelect('service_package.vendor', 'vendor');
    queryBuilder.leftJoinAndSelect('service_package.serviceConcepts', 'service_concept');

    const [data, totalItem] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      data,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage: Math.ceil(totalItem / pageSize),
        totalItem,
      },
    };
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

  async update(
    id: string,
    updateServicePackageDto: UpdateServicePackageDto,
    files: { image?: Express.Multer.File },
  ): Promise<ServicePackage> {
    const servicePackage = await this.findOne(id);

    // Update basic fields
    if (updateServicePackageDto.name) servicePackage.name = updateServicePackageDto.name;
    if (updateServicePackageDto.description !== undefined) servicePackage.description = updateServicePackageDto.description;
    if (updateServicePackageDto.status !== undefined) servicePackage.status = updateServicePackageDto.status;

    // Upload new image if provided
    if (files.image) {
      this.logger.log('Đang tải lên ảnh mới');
      try {
        const uploadResult = await this.uploadService.uploadImage(files.image, 'service-packages/images');
        servicePackage.image = uploadResult;
      } catch (error) {
        this.logger.error(`Lỗi khi tải lên ảnh: ${error.message}`);
        throw new BadRequestException(`Lỗi khi tải lên ảnh: ${error.message}`);
      }
    }

    const updatedServicePackage = await this.servicePackageRepository.save(servicePackage);
    return this.findOne(updatedServicePackage.id);
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

  async findAllMetadata(query?: { current?: number; pageSize?: number }): Promise<{
    data: ServicePackageMetadata[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const currentPage = query?.current ? Number(query.current) : 1;
    const pageSize = query?.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;

    const queryBuilder = this.servicePackageMetadataRepository.createQueryBuilder('metadata');
    queryBuilder.leftJoinAndSelect('metadata.servicePackage', 'servicePackage');

    const [data, totalItem] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      data,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage: Math.ceil(totalItem / pageSize),
        totalItem,
      },
    };
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

  async findAllServiceConceptServiceType(query?: { current?: number; pageSize?: number }): Promise<{
    data: ServiceConceptServiceType[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const currentPage = query?.current ? Number(query.current) : 1;
    const pageSize = query?.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;

    const queryBuilder = this.serviceConceptServiceTypeRepository.createQueryBuilder('service_concept_service_type');
    queryBuilder.leftJoinAndSelect('service_concept_service_type.serviceConcept', 'serviceConcept');

    const [data, totalItem] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      data,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage: Math.ceil(totalItem / pageSize),
        totalItem,
      },
    };
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

  async findAllServiceTypes(query?: { current?: number; pageSize?: number }): Promise<{
    data: ServiceType[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const currentPage = query?.current ? Number(query.current) : 1;
    const pageSize = query?.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;

    const queryBuilder = this.serviceTypeRepository.createQueryBuilder('service_type');
    queryBuilder.leftJoinAndSelect('service_type.serviceConceptServiceTypes', 'serviceConceptServiceTypes');

    const [data, totalItem] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      data,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage: Math.ceil(totalItem / pageSize),
        totalItem,
      },
    };
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
    files: { images?: Express.Multer.File[] },
  ): Promise<ServiceConcept> {
    const startTime = Date.now();
    this.logger.log('Bắt đầu quá trình tạo khái niệm dịch vụ');

    // Upload images if provided
    let uploadedImageUrls: string[] = [];
    if (files.images && files.images.length > 0) {
      this.logger.log('Uploading images');
      try {
        uploadedImageUrls = await this.uploadService.uploadImages(files.images, 'service-concepts/images');
      } catch (error) {
        this.logger.error(`Error uploading images: ${error.message}`);
        throw new BadRequestException(`Error uploading images: ${error.message}`);
      }
    }

    // Verify service package exists if provided
    let servicePackage = null;
    if (createServiceConceptDto.servicePackageId) {
      servicePackage = await this.servicePackageRepository.findOne({
        where: { id: createServiceConceptDto.servicePackageId }
      });
      if (!servicePackage) {
        throw new NotFoundException(`Gói dịch vụ với ID ${createServiceConceptDto.servicePackageId} không tồn tại`);
      }
    }

    const serviceConceptData: Partial<ServiceConcept> = {
      name: createServiceConceptDto.name,
      description: createServiceConceptDto.description,
      price: createServiceConceptDto.price,
      duration: createServiceConceptDto.duration,
      status: createServiceConceptDto.status || ServiceConceptStatus.ACTIVE,
      servicePackage: servicePackage,
      images: uploadedImageUrls,
    };

    // Create the service concept
    const serviceConcept = this.serviceConceptRepository.create(serviceConceptData);
    const savedServiceConcept = await this.serviceConceptRepository.save(serviceConcept);

    // If service type IDs are provided, link them to the concept
    if (createServiceConceptDto.serviceTypeIds && createServiceConceptDto.serviceTypeIds.length > 0) {
      this.logger.log('Đang liên kết loại dịch vụ với khái niệm dịch vụ');
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
        this.logger.error(`Lỗi khi liên kết loại dịch vụ: ${error.message}`);
        throw error;
      }
    }

    this.logger.log(`Khái niệm dịch vụ đã được tạo thành công trong ${Date.now() - startTime}ms`);
    
    // Return the concept with its service types
    return this.serviceConceptRepository.findOne({
      where: { id: savedServiceConcept.id },
      relations: ['serviceConceptServiceTypes', 'serviceConceptServiceTypes.serviceType', 'servicePackage'],
    });
  }

  async findAllServiceConcepts(query?: { current?: number; pageSize?: number }): Promise<{
    data: ServiceConcept[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const currentPage = query?.current ? Number(query.current) : 1;
    const pageSize = query?.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;

    const queryBuilder = this.serviceConceptRepository.createQueryBuilder('service_concept');
    queryBuilder.leftJoinAndSelect('service_concept.serviceConceptServiceTypes', 'serviceConceptServiceTypes');
    queryBuilder.leftJoinAndSelect('serviceConceptServiceTypes.serviceType', 'serviceType');

    const [data, totalItem] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      data,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage: Math.ceil(totalItem / pageSize),
        totalItem,
      },
    };
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
    files: { images?: Express.Multer.File[] },
  ): Promise<ServiceConcept> {
    const serviceConcept = await this.findServiceConcept(id);

    // Upload new images if provided
    if (files.images && files.images.length > 0) {
      this.logger.log('Uploading new images');
      try {
        const uploadedImageUrls = await this.uploadService.uploadImages(files.images, 'service-concepts/images');
        serviceConcept.images = uploadedImageUrls;
      } catch (error) {
        this.logger.error(`Error uploading images: ${error.message}`);
        throw new BadRequestException(`Error uploading images: ${error.message}`);
      }
    }

    // Update basic fields
    if (updateServiceConceptDto.name) serviceConcept.name = updateServiceConceptDto.name;
    if (updateServiceConceptDto.description !== undefined) serviceConcept.description = updateServiceConceptDto.description;
    if (updateServiceConceptDto.price !== undefined) serviceConcept.price = updateServiceConceptDto.price;
    if (updateServiceConceptDto.duration !== undefined) serviceConcept.duration = updateServiceConceptDto.duration;
    if (updateServiceConceptDto.status !== undefined) serviceConcept.status = updateServiceConceptDto.status;

    // Update service types if provided
    if (updateServiceConceptDto.serviceTypeIds) {
      this.logger.log('Đang cập nhật liên kết loại dịch vụ');
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
        this.logger.error(`Lỗi khi cập nhật liên kết loại dịch vụ: ${error.message}`);
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