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
import { DataSource } from 'typeorm';
import { PaginatedFilteredServicePackageResponseDto } from './dto/response/filtered-service-package-response.dto';
import { ServiceConceptImage } from './entities/service-concept-image.entity';
import { GeminiService } from 'src/3rdService/gemini/gemini.service';
import { PaginationDto } from './dto/pagination.dto';

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
    @InjectRepository(ServiceConceptImage)
    private readonly serviceConceptImageRepository: Repository<ServiceConceptImage>,
    private readonly uploadService: UploadService,
    private readonly dataSource: DataSource,
    private readonly geminiService: GeminiService,
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

  async findAll(query?: PaginationDto): Promise<{
    data: (ServicePackage & { countPackageUsed: number })[];
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
    queryBuilder.leftJoinAndSelect('service_concept.images', 'images');

    const [data, totalItem] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    // Get counts for each package
    const packageIds = data.map(pkg => pkg.id);
    const counts = await this.dataSource.query(`
      WITH package_concepts AS (
        SELECT sp.id as package_id, sc.id as concept_id
        FROM service_package sp
        JOIN service_concept sc ON sc.service_package_id = sp.id
        WHERE sp.id = ANY($1)
      )
      SELECT pc.package_id, COUNT(DISTINCT b.id)::integer as count
      FROM package_concepts pc
      JOIN booking b ON b.service_concept_id = pc.concept_id
      WHERE b.status = 'đã hoàn thành'
      GROUP BY pc.package_id
    `, [packageIds]);

    // Create a map of package ID to count
    const countMap = new Map(counts.map(c => [c.package_id, Number(c.count)]));

    // Add counts to each package
    const packagesWithCounts = data.map(pkg => ({
      ...pkg,
      countPackageUsed: countMap.get(pkg.id) || 0
    })) as (ServicePackage & { countPackageUsed: number })[];

    return {
      data: packagesWithCounts,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage: Math.ceil(totalItem / pageSize),
        totalItem,
      },
    };
  }

  async findOne(id: string): Promise<ServicePackage & { countPackageUsed: number }> {
    const servicePackage = await this.servicePackageRepository.findOne({
      where: { id },
      relations: ['vendor', 'serviceConcepts', 'serviceConcepts.images'],
    });
    if (!servicePackage) {
      throw new NotFoundException(`Gói dịch vụ với ID ${id} không tồn tại`);
    }

    // Get count of successful bookings for all concepts in this package
    const countResult = await this.dataSource.query(`
      WITH package_concepts AS (
        SELECT sc.id as concept_id
        FROM service_package sp
        JOIN service_concept sc ON sc.service_package_id = sp.id
        WHERE sp.id = $1
      )
      SELECT COUNT(DISTINCT b.id)::integer as count
      FROM package_concepts pc
      JOIN booking b ON b.service_concept_id = pc.concept_id
      WHERE b.status = 'đã hoàn thành'
    `, [id]);

    return {
      ...servicePackage,
      countPackageUsed: Number(countResult[0].count) || 0
    } as ServicePackage & { countPackageUsed: number };
  }

  async update(
    id: string,
    updateServicePackageDto: UpdateServicePackageDto,
    files: { image?: Express.Multer.File },
  ): Promise<ServicePackage> {
    const startTime = Date.now();
    this.logger.log('Bắt đầu quá trình cập nhật gói dịch vụ');

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
    this.logger.log(`Gói dịch vụ đã được cập nhật thành công trong ${Date.now() - startTime}ms`);
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

  async findAllMetadata(query?: PaginationDto): Promise<{
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

  async findAllServiceConceptServiceType(query?: PaginationDto): Promise<{
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

  async findAllServiceTypes(query?: PaginationDto): Promise<{
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
    };

    // Create the service concept
    const serviceConcept = this.serviceConceptRepository.create(serviceConceptData);
    const savedServiceConcept = await this.serviceConceptRepository.save(serviceConcept);

    // Create service concept images
    if (uploadedImageUrls.length > 0) {
      const imageEntities = uploadedImageUrls.map(url => 
        this.serviceConceptImageRepository.create({
          imageUrl: url,
          serviceConceptId: savedServiceConcept.id
        })
      );
      await this.serviceConceptImageRepository.save(imageEntities);
    }

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
    
    // Generate concept vector if images are provided
    if (files?.images && files.images.length > 0) {
      try {
        this.logger.log(`Bắt đầu tạo concept vector cho khái niệm dịch vụ ${savedServiceConcept.id}`);
        const vectorStartTime = Date.now();
        
        // Try with first image
        try {
          await this.geminiService.generateConceptVector(files.images[0], savedServiceConcept.id);
          this.logger.log(`Concept vector đã được tạo thành công trong ${Date.now() - vectorStartTime}ms`);
        } catch (error) {
          // If first image fails due to safety filter, try with other images
          if (error.message?.includes('Response was blocked') && files.images.length > 1) {
            this.logger.warn(`Ảnh đầu tiên bị chặn bởi bộ lọc an toàn, đang thử với ảnh khác...`);
            for (let i = 1; i < files.images.length; i++) {
              try {
                await this.geminiService.generateConceptVector(files.images[i], savedServiceConcept.id);
                this.logger.log(`Concept vector đã được tạo thành công với ảnh thứ ${i + 1} trong ${Date.now() - vectorStartTime}ms`);
                break;
              } catch (retryError) {
                if (i === files.images.length - 1) {
                  throw retryError; // Re-throw if all images fail
                }
                this.logger.warn(`Ảnh thứ ${i + 1} cũng bị chặn, đang thử ảnh tiếp theo...`);
              }
            }
          } else {
            throw error; // Re-throw if it's not a safety filter issue
          }
        }
      } catch (error) {
        this.logger.error(`Lỗi khi tạo concept vector: ${error.message}`);
        // Don't throw error to prevent service concept creation from failing
      }
    }
    
    // Return the concept with its service types
    return this.serviceConceptRepository.findOne({
      where: { id: savedServiceConcept.id },
      relations: ['serviceConceptServiceTypes', 'serviceConceptServiceTypes.serviceType', 'servicePackage'],
    });
  }

  async findAllServiceConcepts(query?: PaginationDto): Promise<{
    data: (ServiceConcept & { countConceptUsed: number })[];
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
    queryBuilder.leftJoinAndSelect('service_concept.images', 'images');

    const [data, totalItem] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    // Get counts for each concept
    const conceptIds = data.map(concept => concept.id);
    const counts = await this.dataSource.query(`
      SELECT service_concept_id, COUNT(*)::integer as count
      FROM booking
      WHERE service_concept_id = ANY($1)
      AND status = 'đã hoàn thành'
      GROUP BY service_concept_id
    `, [conceptIds]);

    // Create a map of concept ID to count
    const countMap = new Map(counts.map(c => [c.service_concept_id, Number(c.count)]));

    // Add counts to each concept
    const conceptsWithCounts = data.map(concept => ({
      ...concept,
      countConceptUsed: countMap.get(concept.id) || 0
    })) as (ServiceConcept & { countConceptUsed: number })[];

    return {
      data: conceptsWithCounts,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage: Math.ceil(totalItem / pageSize),
        totalItem,
      },
    };
  }

  async findServiceConcept(id: string): Promise<ServiceConcept & { countConceptUsed: number }> {
    const serviceConcept = await this.serviceConceptRepository.findOne({
      where: { id },
      relations: ['serviceConceptServiceTypes', 'serviceConceptServiceTypes.serviceType', 'images'],
    });
    if (!serviceConcept) {
      throw new NotFoundException(`Khái niệm dịch vụ với ID ${id} không tồn tại`);
    }

    // Get count of successful bookings
    const countResult = await this.dataSource.query(`
      SELECT COUNT(*)::integer as count
      FROM booking
      WHERE service_concept_id = $1
      AND status = 'đã hoàn thành'
    `, [id]);

    return {
      ...serviceConcept,
      countConceptUsed: Number(countResult[0].count) || 0
    } as ServiceConcept & { countConceptUsed: number };
  }

  async updateServiceConcept(
    id: string,
    updateServiceConceptDto: UpdateServiceConceptDto,
    files: { images?: Express.Multer.File[] },
  ): Promise<ServiceConcept> {
    const startTime = Date.now();
    this.logger.log('Bắt đầu quá trình cập nhật khái niệm dịch vụ');

    const serviceConcept = await this.findServiceConcept(id);

    // Upload new images if provided
    if (files.images && files.images.length > 0) {
      this.logger.log('Uploading new images');
      try {
        const uploadedImageUrls = await this.uploadService.uploadImages(files.images, 'service-concepts/images');
        
        // Delete existing images first
        await this.serviceConceptImageRepository.delete({ serviceConceptId: id });

        // Then create new images
        const imageEntities = uploadedImageUrls.map(url => 
          this.serviceConceptImageRepository.create({
            imageUrl: url,
            serviceConceptId: id
          })
        );
        await this.serviceConceptImageRepository.save(imageEntities);

        // Update service concept with new images
        serviceConcept.images = imageEntities;
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

    // Update service package if provided
    if (updateServiceConceptDto.servicePackageId) {
      const servicePackage = await this.servicePackageRepository.findOne({
        where: { id: updateServiceConceptDto.servicePackageId }
      });
      if (!servicePackage) {
        throw new NotFoundException(`Gói dịch vụ với ID ${updateServiceConceptDto.servicePackageId} không tồn tại`);
      }
      serviceConcept.servicePackage = servicePackage;
    }

    // Update service types if provided
    if (updateServiceConceptDto.serviceTypeIds) {
      this.logger.log('Đang cập nhật liên kết loại dịch vụ');
      try {
        // Verify all service types exist first
        const serviceTypes = await this.serviceTypeRepository.findByIds(updateServiceConceptDto.serviceTypeIds);
        if (serviceTypes.length !== updateServiceConceptDto.serviceTypeIds.length) {
          throw new NotFoundException('Một hoặc nhiều loại dịch vụ không tồn tại');
        }

        // Get existing relationships
        const existingRelations = await this.serviceConceptServiceTypeRepository.find({
          where: { serviceConceptId: id }
        });

        // Create a map of existing relationships for quick lookup
        const existingMap = new Map(
          existingRelations.map(rel => [rel.serviceTypeId, rel])
        );

        // Create a map of new relationships for quick lookup
        const newMap = new Map(
          updateServiceConceptDto.serviceTypeIds.map(typeId => [typeId, true])
        );

        // Remove relationships that are no longer needed
        const toRemove = existingRelations.filter(rel => !newMap.has(rel.serviceTypeId));
        if (toRemove.length > 0) {
          await this.serviceConceptServiceTypeRepository.remove(toRemove);
        }

        // Add new relationships
        const toAdd = serviceTypes
          .filter(type => !existingMap.has(type.id))
          .map(type => 
            this.serviceConceptServiceTypeRepository.create({
              serviceConceptId: id,
              serviceTypeId: type.id
            })
          );

        if (toAdd.length > 0) {
          await this.serviceConceptServiceTypeRepository.save(toAdd);
        }
      } catch (error) {
        this.logger.error(`Lỗi khi cập nhật liên kết loại dịch vụ: ${error.message}`);
        throw error;
      }
    }

    const updatedServiceConcept = await this.serviceConceptRepository.save(serviceConcept);
    this.logger.log(`Khái niệm dịch vụ đã được cập nhật thành công trong ${Date.now() - startTime}ms`);

    // Generate concept vector if new images are provided
    if (files?.images && files.images.length > 0) {
      try {
        this.logger.log(`Bắt đầu tạo concept vector cho khái niệm dịch vụ ${updatedServiceConcept.id}`);
        const vectorStartTime = Date.now();
        
        // Try with first image
        try {
          await this.geminiService.generateConceptVector(files.images[0], updatedServiceConcept.id);
          this.logger.log(`Concept vector đã được tạo thành công trong ${Date.now() - vectorStartTime}ms`);
        } catch (error) {
          // If first image fails due to safety filter, try with other images
          if (error.message?.includes('Response was blocked') && files.images.length > 1) {
            this.logger.warn(`Ảnh đầu tiên bị chặn bởi bộ lọc an toàn, đang thử với ảnh khác...`);
            for (let i = 1; i < files.images.length; i++) {
              try {
                await this.geminiService.generateConceptVector(files.images[i], updatedServiceConcept.id);
                this.logger.log(`Concept vector đã được tạo thành công với ảnh thứ ${i + 1} trong ${Date.now() - vectorStartTime}ms`);
                break;
              } catch (retryError) {
                if (i === files.images.length - 1) {
                  throw retryError; // Re-throw if all images fail
                }
                this.logger.warn(`Ảnh thứ ${i + 1} cũng bị chặn, đang thử ảnh tiếp theo...`);
              }
            }
          } else {
            throw error; // Re-throw if it's not a safety filter issue
          }
        }
      } catch (error) {
        this.logger.error(`Lỗi khi tạo concept vector: ${error.message}`);
        // Don't throw error to prevent service concept update from failing
      }
    }

    // Return the updated concept with all relations
    return this.findServiceConcept(updatedServiceConcept.id);
  }

  async removeServiceConcept(id: string): Promise<void> {
    const serviceConcept = await this.findServiceConcept(id);
    await this.serviceConceptRepository.remove(serviceConcept);
  }
  //#endregion ServiceConcept

  //#region filterServicePackages
  async filterServicePackages(params: {
    name?: string;
    minPrice?: number;
    maxPrice?: number;
    serviceTypeIds?: string[];
    status?: ServicePackageStatus;
    current?: number;
    pageSize?: number;
    sortBy?: 'name' | 'price' | 'created_at';
    sortDirection?: 'asc' | 'desc';
  }): Promise<PaginatedFilteredServicePackageResponseDto> {
    const currentPage = params.current || 1;
    const pageSize = params.pageSize || 10;
    const actualPageSize = pageSize * pageSize; // Process double the requested size
    const skip = (currentPage - 1) * pageSize;
    const sortDirection = params.sortDirection === 'asc' ? 'ASC' : 'DESC';

    const filterConditions: string[] = [];
    const baseParams: any[] = [];

    // Base query for service package filtering
    let baseQuery = `
      WITH service_package_prices AS (
        SELECT 
          sp.id,
          COALESCE(MIN(sc.price), 0) as min_price,
          COALESCE(MAX(sc.price), 0) as max_price
        FROM service_package sp
        LEFT JOIN service_concept sc ON sc.service_package_id = sp.id
        WHERE sp.status = 'hoạt động'
          AND (sc.status = 'hoạt động' OR sc.status IS NULL)
        GROUP BY sp.id
      ),
      filtered_packages AS (
        SELECT DISTINCT sp.id
        FROM service_package sp
        LEFT JOIN service_concept sc ON sc.service_package_id = sp.id
        LEFT JOIN service_concept_service_type sct ON sct.service_concept_id = sc.id
        LEFT JOIN service_type st ON st.id = sct.service_type_id
        LEFT JOIN service_package_prices spp ON spp.id = sp.id
        WHERE 1=1
    `;

    // Add filters to base query dynamically
    if (params.name) {
      filterConditions.push(`unaccent(sp.name) ILIKE unaccent($${filterConditions.length + 1})`);
      baseParams.push(`%${params.name}%`);
    }

    if (params.serviceTypeIds?.length) {
      filterConditions.push(`st.id = ANY($${filterConditions.length + 1})`);
      baseParams.push(params.serviceTypeIds);
    }

    if (params.status) {
      filterConditions.push(`sp.status = $${filterConditions.length + 1}`);
      baseParams.push(params.status);
    }

    if (params.minPrice !== undefined) {
      filterConditions.push(`spp.min_price >= $${filterConditions.length + 1}`);
      baseParams.push(params.minPrice);
    }

    if (params.maxPrice !== undefined) {
      filterConditions.push(`spp.max_price <= $${filterConditions.length + 1}`);
      baseParams.push(params.maxPrice);
    }

    // Append filters to the base query
    if (filterConditions.length > 0) {
      baseQuery += ` AND ${filterConditions.join(' AND ')}`;
    }

    baseQuery += `
      )
      SELECT DISTINCT
        sp.id,
        sp.name,
        sp.description,
        sp.image_url,
        sp.status,
        sp.created_at,
        sp.updated_at,
        spp.min_price,
        spp.max_price,
        COALESCE(spp.max_price, 0) as sort_price_desc,
        COALESCE(spp.min_price, 0) as sort_price_asc,
        sc.id as service_concept_id,
        sc.name as service_concept_name,
        sc.description as service_concept_description,
        sc.price as service_concept_price,
        sc.duration as service_concept_duration,
        ARRAY_AGG(DISTINCT sci.image_url) FILTER (WHERE sci.image_url IS NOT NULL) as service_concept_image_url,
        st.id as service_type_id,
        st.name as service_type_name,
        st.description as service_type_description
      FROM filtered_packages fp
      JOIN service_package sp ON sp.id = fp.id
      LEFT JOIN service_package_prices spp ON spp.id = sp.id
      LEFT JOIN service_concept sc ON sc.service_package_id = sp.id AND sc.status = 'hoạt động'
      LEFT JOIN service_concept_image sci ON sci.service_concept_id = sc.id
      LEFT JOIN service_concept_service_type sct ON sct.service_concept_id = sc.id
      LEFT JOIN service_type st ON st.id = sct.service_type_id
      GROUP BY 
        sp.id, sp.name, sp.description, sp.image_url, sp.status, sp.created_at, sp.updated_at,
        spp.min_price, spp.max_price, sc.id, sc.name, sc.description, sc.price, sc.duration,
        st.id, st.name, st.description
    `;

    // Add sorting
    switch (params.sortBy) {
      case 'price':
        if (sortDirection === 'DESC') {
          baseQuery += ` ORDER BY sort_price_desc ${sortDirection}`;
        } else {
          baseQuery += ` ORDER BY sort_price_asc ${sortDirection}`;
        }
        break;
      case 'name':
        baseQuery += ` ORDER BY sp.name ${sortDirection}`;
        break;
      default:
        baseQuery += ` ORDER BY sp.created_at ${sortDirection}`;
    }

    // Add pagination
    baseQuery += ` LIMIT $${baseParams.length + 1} OFFSET $${baseParams.length + 2}`;
    baseParams.push(actualPageSize, skip);

    // Get total count query
    const countFilterConditions: string[] = [];
    const countParams: any[] = [];

    let countQuery = `
      WITH service_package_prices AS (
        SELECT 
          sp.id,
          COALESCE(MIN(sc.price), 0) as min_price,
          COALESCE(MAX(sc.price), 0) as max_price
        FROM service_package sp
        LEFT JOIN service_concept sc ON sc.service_package_id = sp.id
        WHERE sp.status = 'hoạt động'
          AND (sc.status = 'hoạt động' OR sc.status IS NULL)
        GROUP BY sp.id
      ),
      filtered_packages AS (
        SELECT DISTINCT sp.id
        FROM service_package sp
        LEFT JOIN service_concept sc ON sc.service_package_id = sp.id
        LEFT JOIN service_concept_service_type sct ON sct.service_concept_id = sc.id
        LEFT JOIN service_type st ON st.id = sct.service_type_id
        LEFT JOIN service_package_prices spp ON spp.id = sp.id
        WHERE 1=1
    `;

    // Add filters to count query dynamically
    if (params.name) {
      countFilterConditions.push(`unaccent(sp.name) ILIKE unaccent($${countFilterConditions.length + 1})`);
      countParams.push(`%${params.name}%`);
    }

    if (params.serviceTypeIds?.length) {
      countFilterConditions.push(`st.id = ANY($${countFilterConditions.length + 1})`);
      countParams.push(params.serviceTypeIds);
    }

    if (params.status) {
      countFilterConditions.push(`sp.status = $${countFilterConditions.length + 1}`);
      countParams.push(params.status);
    }

    if (params.minPrice !== undefined) {
      countFilterConditions.push(`spp.min_price >= $${countFilterConditions.length + 1}`);
      countParams.push(params.minPrice);
    }

    if (params.maxPrice !== undefined) {
      countFilterConditions.push(`spp.max_price <= $${countFilterConditions.length + 1}`);
      countParams.push(params.maxPrice);
    }

    // Append filters to the count query
    if (countFilterConditions.length > 0) {
      countQuery += ` AND ${countFilterConditions.join(' AND ')}`;
    }

    countQuery += `
      )
      SELECT COUNT(DISTINCT id) as count
      FROM filtered_packages
    `;

    // Execute queries
    const [packageData, totalItem] = await Promise.all([
      this.dataSource.query(baseQuery, baseParams),
      this.dataSource.query(countQuery, countParams),
    ]);

    if (packageData.length === 0) {
      return {
        data: [],
        pagination: {
          current: currentPage,
          pageSize,
          totalPage: 0,
          totalItem: 0,
        },
      };
    }

    // Group service concepts and types by package
    const packagesByServicePackage = new Map();
    // const serviceTypesByConcept = new Map(); // This map is not used

    packageData.forEach((row: any) => {
      if (!packagesByServicePackage.has(row.id)) {
        packagesByServicePackage.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          image: row.image_url,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          minPrice: row.min_price ? Number(parseFloat(row.min_price).toFixed(2)) : null,
          maxPrice: row.max_price ? Number(parseFloat(row.max_price).toFixed(2)) : null,
          serviceConcepts: new Map<string, any>() // Use a Map for concepts to avoid duplicates
        });
      }

      const servicePackage = packagesByServicePackage.get(row.id);

      if (row.service_concept_id) {
        if (!servicePackage.serviceConcepts.has(row.service_concept_id)) {
          servicePackage.serviceConcepts.set(row.service_concept_id, {
            id: row.service_concept_id,
            name: row.service_concept_name,
            description: row.service_concept_description,
            price: Number(parseFloat(row.service_concept_price).toFixed(2)),
            duration: row.service_concept_duration,
            images: Array.isArray(row.service_concept_image_url) ? row.service_concept_image_url : [],
            serviceTypes: new Map<string, any>() // Use a Map for types to avoid duplicates
          });
        }

        if (row.service_type_id) {
          const concept = servicePackage.serviceConcepts.get(row.service_concept_id);
          if (!concept.serviceTypes.has(row.service_type_id)) { // Check if type already added
            concept.serviceTypes.set(row.service_type_id, {
              id: row.service_type_id,
              name: row.service_type_name,
              description: row.service_type_description
            });
          }
        }
      }
    });

    // After getting the results, slice to only show requested page size
    const servicePackages = Array.from(packagesByServicePackage.values())
      .map(pkg => ({
        ...pkg,
        serviceConcepts: Array.from(pkg.serviceConcepts.values()).map((concept: any) => ({
          ...concept,
          serviceTypes: Array.from(concept.serviceTypes.values())
        }))
      }))
      .slice(0, pageSize); // Only show requested page size

    const totalPage = Math.ceil(Number(totalItem[0].count) / pageSize);

    return {
      data: servicePackages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        image: pkg.image,
        status: pkg.status,
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt,
        minPrice: pkg.minPrice,
        maxPrice: pkg.maxPrice,
        serviceConcepts: pkg.serviceConcepts
      })),
      pagination: {
        current: currentPage,
        pageSize,
        totalPage,
        totalItem: Number(totalItem[0].count),
      },
    };
  }
  //#endregion filterServicePackages
}