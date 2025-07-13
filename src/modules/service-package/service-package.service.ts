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
import { ServicePackageStatus, ConceptRangeType } from 'src/constants/servicePackage.enum';
import { ServiceConceptStatus } from 'src/constants/serviceConcept.enum';
import { ServiceTypeStatus } from 'src/constants/serviceType.enum';
import { DataSource } from 'typeorm';
import { PaginatedFilteredServicePackageResponseDto } from './dto/response/filtered-service-package-response.dto';
import { ServiceConceptImage } from './entities/service-concept-image.entity';
import { GeminiService } from 'src/3rdService/gemini/gemini.service';
import { PaginationDto } from './dto/pagination.dto';
import { Commission } from '../commission/entities/commission.entity';
import { CommissionStatus, CommissionType } from 'src/constants/commision.enum';
import { FilterServiceTypeDto } from './dto/filter-service-type.dto';

@Injectable()
export class ServicePackageService {
  private readonly logger = new Logger(ServicePackageService.name);
  
  // Constants for pricing calculation
  private readonly COMMISSION_RATE = 0.30; // 30%
  private readonly TAX_RATE = 0.05; // 5%
  private readonly TOTAL_MULTIPLIER = 1 + this.COMMISSION_RATE + this.TAX_RATE; // 1.35

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
    @InjectRepository(Commission)
    private readonly commissionRepository: Repository<Commission>,
    private readonly uploadService: UploadService,
    private readonly dataSource: DataSource,
    private readonly geminiService: GeminiService,
  ) { }

  /**
   * Calculate origin price from final price (reverse calculation)
   * Final Price = Origin Price + Commission + Tax
   * Origin Price = Final Price / (1 + Commission Rate + Tax Rate)
   */
  private calculateOriginPrice(finalPrice: number): number {
    return Math.round(finalPrice / this.TOTAL_MULTIPLIER);
  }

  /**
   * Calculate commission amount from origin price
   */
  private calculateCommissionAmount(originPrice: number): number {
    return Math.round(originPrice * this.COMMISSION_RATE);
  }

  /**
   * Calculate tax amount from origin price
   */
  private calculateTaxAmount(originPrice: number): number {
    return Math.round(originPrice * this.TAX_RATE);
  }

  /**
   * Calculate final price from origin price (forward calculation)
   */
  private calculateFinalPrice(originPrice: number): number {
    return Math.round(originPrice * this.TOTAL_MULTIPLIER);
  }

  /**
   * Get pricing breakdown for invoice
   * Returns: { originPrice, commissionAmount, taxAmount, finalPrice }
   */
  private getPricingBreakdown(finalPrice: number): {
    originPrice: number;
    commissionAmount: number;
    taxAmount: number;
    finalPrice: number;
  } {
    const originPrice = this.calculateOriginPrice(finalPrice);
    const commissionAmount = this.calculateCommissionAmount(originPrice);
    const taxAmount = this.calculateTaxAmount(originPrice);
    
    return {
      originPrice,
      commissionAmount,
      taxAmount,
      finalPrice
    };
  }

  /**
   * Get final price (customer price) from origin price
   */
  private getFinalPrice(originPrice: number): number {
    return this.calculateFinalPrice(originPrice);
  }

  /**
   * Get pricing breakdown from origin price (for existing records)
   * Returns: { originPrice, commissionAmount, taxAmount, finalPrice }
   */
  private getPricingBreakdownFromOrigin(originPrice: number): {
    originPrice: number;
    commissionAmount: number;
    taxAmount: number;
    finalPrice: number;
  } {
    const commissionAmount = this.calculateCommissionAmount(originPrice);
    const taxAmount = this.calculateTaxAmount(originPrice);
    const finalPrice = this.calculateFinalPrice(originPrice);
    
    return {
      originPrice,
      commissionAmount,
      taxAmount,
      finalPrice
    };
  }

  /**
   * Get pricing breakdown for invoice (public method)
   * This method can be used by other services to get pricing breakdown for invoice generation
   * Returns: { originPrice, commissionAmount, taxAmount, finalPrice }
   */
  public getInvoicePricingBreakdown(serviceConceptId: string): Promise<{
    originPrice: number;
    commissionAmount: number;
    taxAmount: number;
    finalPrice: number;
  }> {
    return this.serviceConceptRepository.findOne({
      where: { id: serviceConceptId },
      select: ['price'] // Only get the price field
    }).then(concept => {
      if (!concept) {
        throw new NotFoundException(`Service concept with ID ${serviceConceptId} not found`);
      }
      
      // concept.price is the origin price stored in DB
      return this.getPricingBreakdownFromOrigin(concept.price);
    });
  }

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

  async findAll(query?: PaginationDto, showAll = false): Promise<{
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
    if (!showAll) {
      queryBuilder.andWhere('service_package.status = :status', { status: ServicePackageStatus.ACTIVE });
    }
    queryBuilder.leftJoinAndSelect('service_package.vendor', 'vendor');
    queryBuilder.leftJoinAndSelect('service_package.serviceConcepts', 'service_concept');
    queryBuilder.leftJoinAndSelect('service_concept.images', 'images');

    const [data, totalItem] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    // Get counts for each package
    const packageIds = data.map((pkg) => pkg.id);

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
    const countMap = new Map(
      counts.map((c) => [c.package_id, Number(c.count)]),
    );

    // Add counts to each package
    const packagesWithCounts = data.map((pkg) => ({
      ...pkg,
      countPackageUsed: countMap.get(pkg.id) || 0,
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

  async findOne(id: string, showAll = false): Promise<ServicePackage & { countPackageUsed: number }> {
    const servicePackage = await this.servicePackageRepository.findOne({
      where: showAll ? { id } : { id, status: ServicePackageStatus.ACTIVE },
      relations: [
        'vendor',
        'vendor.locations',
        'serviceConcepts',
        'serviceConcepts.images',
        'serviceConcepts.serviceConceptServiceTypes',
        'serviceConcepts.serviceConceptServiceTypes.serviceType',
      ],
    });
    if (!servicePackage) {
      throw new NotFoundException(
        `Gói dịch vụ với ID ${id} không tồn tại`,
      );
    }

    // Get count of successful bookings for all concepts in this package
    const countResult = await this.dataSource.query(
      `
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
    `,
      [id],
    );

    return {
      ...servicePackage,
      countPackageUsed: Number(countResult[0].count) || 0,
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
    // Xoá các concept liên quan và các bảng phụ liên quan trước khi xoá package
    if (servicePackage.serviceConcepts && servicePackage.serviceConcepts.length > 0) {
      for (const concept of servicePackage.serviceConcepts) {
        this.logger.log(`Đang xoá concept ${concept.id} thuộc package ${id}`);
        // Lấy tất cả booking id liên quan đến concept này
        const bookings = await this.dataSource.query(`SELECT id FROM booking WHERE service_concept_id = $1`, [concept.id]);
        const bookingIds = bookings.map((b: any) => b.id);
        if (bookingIds.length > 0) {
          // Lấy tất cả invoice id liên quan đến các booking này
          const invoices = await this.dataSource.query(`SELECT id FROM invoice WHERE booking_id = ANY($1)`, [bookingIds]);
          const invoiceIds = invoices.map((inv: any) => inv.id);
          if (invoiceIds.length > 0) {
            // Xoá tất cả payment liên quan trước
            await this.dataSource.query(`DELETE FROM payment WHERE invoice_id = ANY($1)`, [invoiceIds]);
          }
          // Xoá tất cả invoice liên quan trước
          await this.dataSource.query(`DELETE FROM invoice WHERE id = ANY($1)`, [invoiceIds]);
          // Xoá tất cả booking_history liên quan trước
          await this.dataSource.query(`DELETE FROM booking_history WHERE booking_id = ANY($1)`, [bookingIds]);
          // Xoá tất cả booking liên quan đến concept này
          await this.dataSource.query(`DELETE FROM booking WHERE id = ANY($1)`, [bookingIds]);
        }
        // Xoá cart_item liên quan trước
        await this.dataSource.query(`DELETE FROM cart_item WHERE service_concept_id = $1`, [concept.id]);
        // Xoá wishlist_item liên quan trước
        await this.dataSource.query(`DELETE FROM wishlist_item WHERE service_concept_id = $1`, [concept.id]);
        // Xoá concept vector trước để tránh lỗi khoá ngoại
        await this.dataSource.query(`DELETE FROM concept_vector WHERE concept_id = $1`, [concept.id]);
        // Xoá images
        await this.serviceConceptImageRepository.delete({ serviceConceptId: concept.id });
        // Xoá serviceConceptServiceType
        await this.serviceConceptServiceTypeRepository.delete({ serviceConceptId: concept.id });
        // Xoá commission
        await this.commissionRepository.delete({ serviceConceptId: concept.id });
        // Xoá concept
        await this.serviceConceptRepository.delete(concept.id);
        this.logger.log(`Đã xoá concept ${concept.id}`);
      }
    }
    await this.servicePackageRepository.remove(servicePackage);
    this.logger.log(`Đã xoá service package ${id} và toàn bộ dữ liệu liên quan.`);
  }

  //#region ServicePackageMetadata
  async createMetadata(dto: CreateServicePackageMetadataDto): Promise<ServicePackageMetadata> {
    const metadata = this.servicePackageMetadataRepository.create(dto);
    return this.servicePackageMetadataRepository.save(metadata);
  }

  async findAllMetadata(query?: PaginationDto, showAll = false): Promise<{
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

  async findMetadata(id: string, showAll = false): Promise<ServicePackageMetadata> {
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

  async findAllServiceConceptServiceType(query?: PaginationDto, showAll = false): Promise<{
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

  async findServiceConceptServiceType(serviceConceptId: string, serviceTypeId: string, showAll = false): Promise<ServiceConceptServiceType> {
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
    const serviceType = this.serviceTypeRepository.create({
      ...dto,
      status: dto.status || ServiceTypeStatus.ACTIVE
    });
    return this.serviceTypeRepository.save(serviceType);
  }

  async findAllServiceTypes(query?: PaginationDto, showAll?: boolean): Promise<{
    data: (ServiceType & { conceptCount: number; packageCount: number })[];
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

    // Check if this is a filter query
    const isFilterQuery = query && ('name' in query || 'status' in query || 'sortBy' in query || 'sortDirection' in query);
    if (isFilterQuery) {
      return this.filterServiceTypes(query as any);
    }

    // Original simple query
    const queryBuilder = this.serviceTypeRepository.createQueryBuilder('service_type');
    if (!showAll) {
      queryBuilder.andWhere('service_type.status = :status', { status: ServiceTypeStatus.ACTIVE });
    }
    queryBuilder.leftJoinAndSelect('service_type.serviceConceptServiceTypes', 'serviceConceptServiceTypes');

    const [data, totalItem] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    // Get counts for each service type
    const serviceTypeIds = data.map(type => type.id);
    const counts = await this.getServiceTypeCounts(serviceTypeIds);

    // Add counts to each service type
    const serviceTypesWithCounts = data.map(type => ({
      ...type,
      conceptCount: counts.conceptCounts.get(type.id) || 0,
      packageCount: counts.packageCounts.get(type.id) || 0
    })) as (ServiceType & { conceptCount: number; packageCount: number })[];

    return {
      data: serviceTypesWithCounts,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage: Math.ceil(totalItem / pageSize),
        totalItem,
      },
    };
  }

  private async getServiceTypeCounts(serviceTypeIds: string[]): Promise<{
    conceptCounts: Map<string, number>;
    packageCounts: Map<string, number>;
  }> {
    if (serviceTypeIds.length === 0) {
      return {
        conceptCounts: new Map(),
        packageCounts: new Map()
      };
    }

    // Get concept counts
    const conceptCounts = await this.dataSource.query(`
      SELECT sct.service_type_id, COUNT(DISTINCT sct.service_concept_id)::integer as count
      FROM service_concept_service_type sct
      WHERE sct.service_type_id = ANY($1)
      GROUP BY sct.service_type_id
    `, [serviceTypeIds]);

    // Get package counts
    const packageCounts = await this.dataSource.query(`
      SELECT sct.service_type_id, COUNT(DISTINCT sp.id)::integer as count
      FROM service_concept_service_type sct
      JOIN service_concept sc ON sc.id = sct.service_concept_id
      JOIN service_package sp ON sp.id = sc.service_package_id
      WHERE sct.service_type_id = ANY($1)
      GROUP BY sct.service_type_id
    `, [serviceTypeIds]);

    // Create maps
    const conceptCountMap = new Map<string, number>(conceptCounts.map((c: any) => [c.service_type_id, Number(c.count)]));
    const packageCountMap = new Map<string, number>(packageCounts.map((c: any) => [c.service_type_id, Number(c.count)]));

    return {
      conceptCounts: conceptCountMap,
      packageCounts: packageCountMap
    };
  }

  async filterServiceTypes(params: FilterServiceTypeDto): Promise<{
    data: (ServiceType & { conceptCount: number; packageCount: number })[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const currentPage = params.current || 1;
    const pageSize = params.pageSize || 10;
    const skip = (currentPage - 1) * pageSize;
    const sortDirection = params.sortDirection === 'asc' ? 'ASC' : 'DESC';

    const filterConditions: string[] = [];
    const baseParams: any[] = [];

    // Base query for service type filtering
    let baseQuery = `
      WITH service_type_counts AS (
        SELECT 
          st.id,
          COUNT(DISTINCT sct.service_concept_id)::integer as concept_count,
          COUNT(DISTINCT sp.id)::integer as package_count
        FROM service_type st
        LEFT JOIN service_concept_service_type sct ON sct.service_type_id = st.id
        LEFT JOIN service_concept sc ON sc.id = sct.service_concept_id
        LEFT JOIN service_package sp ON sp.id = sc.service_package_id
        GROUP BY st.id
      )
      SELECT 
        st.id,
        st.name,
        st.description,
        st.status,
        st.created_at,
        st.updated_at,
        COALESCE(stc.concept_count, 0) as concept_count,
        COALESCE(stc.package_count, 0) as package_count
      FROM service_type st
      LEFT JOIN service_type_counts stc ON stc.id = st.id
      WHERE 1=1
    `;

    if (params.name) {
      filterConditions.push(`unaccent(st.name) ILIKE unaccent($${filterConditions.length + 1})`);
      baseParams.push(`%${params.name}%`);
    }

    if (params.status) {
      filterConditions.push(`st.status = $${filterConditions.length + 1}`);
      baseParams.push(params.status);
    }

    // Append filters to the base query
    if (filterConditions.length > 0) {
      baseQuery += ` AND ${filterConditions.join(' AND ')}`;
    }

    // Add sorting
    switch (params.sortBy) {
      case 'concept_count':
        baseQuery += ` ORDER BY concept_count ${sortDirection}`;
        break;
      case 'package_count':
        baseQuery += ` ORDER BY package_count ${sortDirection}`;
        break;
      case 'name':
        baseQuery += ` ORDER BY st.name ${sortDirection}`;
        break;
      default:
        baseQuery += ` ORDER BY st.created_at ${sortDirection}`;
    }

    // Add pagination
    baseQuery += ` LIMIT $${baseParams.length + 1} OFFSET $${baseParams.length + 2}`;
    baseParams.push(pageSize, skip);

    // Get total count query
    const countFilterConditions: string[] = [];
    const countParams: any[] = [];

    let countQuery = `
      SELECT COUNT(*)::integer as count
      FROM service_type st
      WHERE 1=1
    `;

    if (params.name) {
      countFilterConditions.push(`unaccent(st.name) ILIKE unaccent($${countFilterConditions.length + 1})`);
      countParams.push(`%${params.name}%`);
    }

    if (params.status) {
      countFilterConditions.push(`st.status = $${countFilterConditions.length + 1}`);
      countParams.push(params.status);
    }

    if (countFilterConditions.length > 0) {
      countQuery += ` AND ${countFilterConditions.join(' AND ')}`;
    }

    // Execute queries
    const [serviceTypeData, totalItem] = await Promise.all([
      this.dataSource.query(baseQuery, baseParams),
      this.dataSource.query(countQuery, countParams),
    ]);

    if (serviceTypeData.length === 0) {
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

    // Transform data to match entity structure
    const serviceTypes = serviceTypeData.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      conceptCount: Number(row.concept_count),
      packageCount: Number(row.package_count)
    })) as (ServiceType & { conceptCount: number; packageCount: number })[];

    const totalPage = Math.ceil(Number(totalItem[0].count) / pageSize);

    return {
      data: serviceTypes,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage,
        totalItem: Number(totalItem[0].count),
      },
    };
  }

  async findServiceType(id: string, showAll = false): Promise<ServiceType & { conceptCount: number; packageCount: number }> {
    const serviceType = await this.serviceTypeRepository.findOne({
      where: showAll ? { id } : { id, status: ServiceTypeStatus.ACTIVE },
      relations: ['serviceConceptServiceTypes'],
    });
    if (!serviceType) {
      throw new NotFoundException(`Loại dịch vụ với ID ${id} không tồn tại`);
    }

    // Get counts for this service type
    const counts = await this.getServiceTypeCounts([id]);

    return {
      ...serviceType,
      conceptCount: counts.conceptCounts.get(id) || 0,
      packageCount: counts.packageCounts.get(id) || 0
    } as ServiceType & { conceptCount: number; packageCount: number };
  }

  async updateServiceType(id: string, dto: UpdateServiceTypeDto): Promise<ServiceType & { conceptCount: number; packageCount: number }> {
    const serviceType = await this.findServiceType(id);
    Object.assign(serviceType, dto);
    const updatedServiceType = await this.serviceTypeRepository.save(serviceType);

    // Return with counts
    return this.findServiceType(updatedServiceType.id);
  }

  async toggleServiceTypeStatus(id: string): Promise<ServiceType & { conceptCount: number; packageCount: number }> {
    const serviceType = await this.findServiceType(id);

    // Toggle status
    serviceType.status = serviceType.status === ServiceTypeStatus.ACTIVE
      ? ServiceTypeStatus.INACTIVE
      : ServiceTypeStatus.ACTIVE;

    const updatedServiceType = await this.serviceTypeRepository.save(serviceType);

    this.logger.log(`Service type ${id} status changed to: ${updatedServiceType.status}`);

    // Return with counts
    return this.findServiceType(updatedServiceType.id);
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

    // Handle concept range type logic with strict validation
    let finalDuration = createServiceConceptDto.duration;
    let finalNumberOfDays = createServiceConceptDto.numberOfDays || 1;
    let finalConceptRangeType = createServiceConceptDto.conceptRangeType;

    // Auto-determine concept range type if not provided
    if (!finalConceptRangeType) {
      finalConceptRangeType = finalNumberOfDays > 1 ? ConceptRangeType.MULTIPLE_DAYS : ConceptRangeType.SINGLE_DAY;
    }

    // STRICT VALIDATION: Check concept range type consistency
    if (finalConceptRangeType === ConceptRangeType.SINGLE_DAY) {
      // For single day concepts:
      // 1. numberOfDays MUST be 1
      if (finalNumberOfDays !== 1) {
        throw new BadRequestException('Concept 1 ngày chỉ được phép có numberOfDays = 1');
      }
      // 2. duration must be provided and > 0
      if (!finalDuration || finalDuration <= 0) {
        throw new BadRequestException('Concept 1 ngày phải có duration > 0');
      }
    } else if (finalConceptRangeType === ConceptRangeType.MULTIPLE_DAYS) {
      // For multi-day concepts:
      // 1. numberOfDays must be >= 2
      if (finalNumberOfDays < 2) {
        throw new BadRequestException('Concept nhiều ngày phải có numberOfDays >= 2');
      }
      // 2. duration MUST be 0
      if (finalDuration !== 0) {
        throw new BadRequestException('Concept nhiều ngày phải có duration = 0');
      }
    }

    const serviceConceptData: Partial<ServiceConcept> = {
      name: createServiceConceptDto.name,
      description: createServiceConceptDto.description,
      price: createServiceConceptDto.price,
      duration: finalDuration,
      conceptRangeType: finalConceptRangeType,
      numberOfDays: finalNumberOfDays,
      status: createServiceConceptDto.status || ServiceConceptStatus.ACTIVE,
      servicePackage: servicePackage,
    };

    // Calculate pricing breakdown using reverse calculation
    // The input price is the final price that customers will see
    const pricingBreakdown = this.getPricingBreakdown(createServiceConceptDto.price);
    
    this.logger.log(`Pricing breakdown for concept ${createServiceConceptDto.name}:`);
    this.logger.log(`- Final Price (Customer sees): ${pricingBreakdown.finalPrice}`);
    this.logger.log(`- Origin Price (Stored in DB): ${pricingBreakdown.originPrice}`);
    this.logger.log(`- Commission: ${pricingBreakdown.commissionAmount}`);
    this.logger.log(`- Tax: ${pricingBreakdown.taxAmount}`);

    // Store the origin price in the database (not the final price)
    serviceConceptData.price = pricingBreakdown.originPrice;
    
    // Create the service concept first
    const serviceConcept = this.serviceConceptRepository.create(serviceConceptData);
    const savedServiceConcept = await this.serviceConceptRepository.save(serviceConcept);

    // Now create commission with the actual service concept ID
    const commissionData = this.commissionRepository.create({
      serviceConceptId: savedServiceConcept.id,
      commissionRate: this.COMMISSION_RATE * 100, // Store as percentage (30)
      commissionType: CommissionType.PERCENTAGE,
      commissionAmount: pricingBreakdown.commissionAmount,
      status: CommissionStatus.ACTIVE,
    });
    await this.commissionRepository.save(commissionData);

    // Create service concept images
    let savedImageEntities: ServiceConceptImage[] = [];
    if (uploadedImageUrls.length > 0) {
      const imageEntities = uploadedImageUrls.map(url =>
        this.serviceConceptImageRepository.create({
          imageUrl: url,
          serviceConceptId: savedServiceConcept.id
        })
      );
      savedImageEntities = await this.serviceConceptImageRepository.save(imageEntities);
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

    // Generate concept vector for each image using its service_concept_image.id
    if (files?.images && files.images.length > 0 && savedImageEntities.length === files.images.length) {
      this.logger.log(`Bắt đầu tạo concept vector cho tất cả ảnh của khái niệm dịch vụ ${savedServiceConcept.id}`);
      const vectorStartTime = Date.now();
      for (let i = 0; i < files.images.length; i++) {
        await this.geminiService.generateConceptVector(files.images[i], savedImageEntities[i].id);
        this.logger.log(`Concept vector đã được tạo thành công với ảnh thứ ${i + 1} (service_concept_image_id: ${savedImageEntities[i].id}) trong ${Date.now() - vectorStartTime}ms`);
      }
    }

    // Return the concept with its service types
    return this.serviceConceptRepository.findOne({
      where: { id: savedServiceConcept.id },
      relations: ['serviceConceptServiceTypes', 'serviceConceptServiceTypes.serviceType', 'servicePackage'],
    });
  }

  async findAllServiceConcepts(query?: PaginationDto, showAll = false): Promise<{
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
    if (!showAll) {
      queryBuilder.andWhere('service_concept.status = :status', { status: ServiceConceptStatus.ACTIVE });
    }
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

    // Add counts to each concept and convert origin price to final price for customer display
    const conceptsWithCounts = data.map(concept => {
      const finalPrice = this.getFinalPrice(concept.price);
      return {
        ...concept,
        price: finalPrice, // Show final price to customer
        countConceptUsed: countMap.get(concept.id) || 0
      };
    }) as (ServiceConcept & { countConceptUsed: number })[];

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

  async findServiceConcept(id: string, showAll = false): Promise<ServiceConcept & { countConceptUsed: number }> {
    const serviceConcept = await this.serviceConceptRepository.findOne({
      where: showAll ? { id } : { id, status: ServiceConceptStatus.ACTIVE },
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

    const finalPrice = this.getFinalPrice(serviceConcept.price);
    return {
      ...serviceConcept,
      price: finalPrice, // Show final price to customer
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

    // Update basic fields - only if provided (not undefined)
    if (updateServiceConceptDto.name !== undefined) {
      serviceConcept.name = updateServiceConceptDto.name;
    }
    if (updateServiceConceptDto.description !== undefined) {
      serviceConcept.description = updateServiceConceptDto.description;
    }
    if (updateServiceConceptDto.price !== undefined) {
      // Calculate pricing breakdown using reverse calculation
      // The input price is the final price that customers will see
      const pricingBreakdown = this.getPricingBreakdown(updateServiceConceptDto.price);
      
      this.logger.log(`Updated pricing breakdown for concept ${id}:`);
      this.logger.log(`- Final Price (Customer sees): ${pricingBreakdown.finalPrice}`);
      this.logger.log(`- Origin Price (Stored in DB): ${pricingBreakdown.originPrice}`);
      this.logger.log(`- Commission: ${pricingBreakdown.commissionAmount}`);
      this.logger.log(`- Tax: ${pricingBreakdown.taxAmount}`);

      // Update commission if price changes
      const existingCommission = await this.commissionRepository.findOne({
        where: { serviceConceptId: id }
      });

      if (existingCommission) {
        // Update commission amount based on new origin price
        existingCommission.commissionAmount = pricingBreakdown.commissionAmount;
        await this.commissionRepository.save(existingCommission);
      } else {
        // Create new commission if doesn't exist
        const commissionData = this.commissionRepository.create({
          serviceConceptId: id,
          commissionRate: this.COMMISSION_RATE * 100, // Store as percentage (30)
          commissionType: CommissionType.PERCENTAGE,
          commissionAmount: pricingBreakdown.commissionAmount,
          status: CommissionStatus.ACTIVE,
        });
        await this.commissionRepository.save(commissionData);
      }

      // Store the origin price in the database (not the final price)
      serviceConcept.price = pricingBreakdown.originPrice;
    }
    if (updateServiceConceptDto.duration !== undefined) {
      serviceConcept.duration = updateServiceConceptDto.duration;
    }

    // Handle concept range type logic for updates with strict validation
    if (updateServiceConceptDto.conceptRangeType !== undefined || 
        updateServiceConceptDto.numberOfDays !== undefined ||
        updateServiceConceptDto.duration !== undefined) {
      
      let finalDuration = updateServiceConceptDto.duration !== undefined ? updateServiceConceptDto.duration : serviceConcept.duration;
      let finalNumberOfDays = updateServiceConceptDto.numberOfDays !== undefined ? updateServiceConceptDto.numberOfDays : serviceConcept.numberOfDays;
      let finalConceptRangeType = updateServiceConceptDto.conceptRangeType !== undefined ? updateServiceConceptDto.conceptRangeType : serviceConcept.conceptRangeType;

      // Auto-determine concept range type if not provided
      if (!finalConceptRangeType) {
        finalConceptRangeType = finalNumberOfDays > 1 ? ConceptRangeType.MULTIPLE_DAYS : ConceptRangeType.SINGLE_DAY;
      }

      // STRICT VALIDATION: Check concept range type consistency
      if (finalConceptRangeType === ConceptRangeType.SINGLE_DAY) {
        // For single day concepts:
        // 1. numberOfDays MUST be 1
        if (finalNumberOfDays !== 1) {
          throw new BadRequestException('Concept 1 ngày chỉ được phép có numberOfDays = 1');
        }
        // 2. duration must be provided and > 0
        if (!finalDuration || finalDuration <= 0) {
          throw new BadRequestException('Concept 1 ngày phải có duration > 0');
        }
      } else if (finalConceptRangeType === ConceptRangeType.MULTIPLE_DAYS) {
        // For multi-day concepts:
        // 1. numberOfDays must be >= 2
        if (finalNumberOfDays < 2) {
          throw new BadRequestException('Concept nhiều ngày phải có numberOfDays >= 2');
        }
        // 2. duration MUST be 0
        if (finalDuration !== 0) {
          throw new BadRequestException('Concept nhiều ngày phải có duration = 0');
        }
      }

      serviceConcept.duration = finalDuration;
      serviceConcept.conceptRangeType = finalConceptRangeType;
      serviceConcept.numberOfDays = finalNumberOfDays;
    }

    if (updateServiceConceptDto.status !== undefined) {
      serviceConcept.status = updateServiceConceptDto.status;
    }

    // Update service package if provided
    if (updateServiceConceptDto.servicePackageId !== undefined) {
      const servicePackage = await this.servicePackageRepository.findOne({
        where: { id: updateServiceConceptDto.servicePackageId }
      });
      if (!servicePackage) {
        throw new NotFoundException(`Gói dịch vụ với ID ${updateServiceConceptDto.servicePackageId} không tồn tại`);
      }
      serviceConcept.servicePackage = servicePackage;
    }

    // Update service types if provided
    if (updateServiceConceptDto.serviceTypeIds !== undefined) {
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
        const toAdd = updateServiceConceptDto.serviceTypeIds
          .filter(typeId => !existingMap.has(typeId))
          .map(typeId =>
            this.serviceConceptServiceTypeRepository.create({
              serviceConceptId: id,
              serviceTypeId: typeId
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
    const startTime = Date.now();
    this.logger.log(`Bắt đầu quá trình xóa khái niệm dịch vụ ${id}`);

    const serviceConcept = await this.findServiceConcept(id);

    // Check if there are any active bookings using this concept
    const activeBookings = await this.dataSource.query(`
      SELECT COUNT(*)::integer as count
      FROM booking
      WHERE service_concept_id = $1
      AND status IN ('đã xác nhận', 'đã thanh toán', 'đã hoàn thành')
    `, [id]);

    if (activeBookings[0].count > 0) {
      throw new BadRequestException(
        `Không thể xóa khái niệm dịch vụ vì có ${activeBookings[0].count} booking đang sử dụng`
      );
    }

    // Check if there are any pending bookings
    const pendingBookings = await this.dataSource.query(`
      SELECT COUNT(*)::integer as count
      FROM booking
      WHERE service_concept_id = $1
      AND status = 'chờ xử lý'
    `, [id]);

    if (pendingBookings[0].count > 0) {
      this.logger.warn(`Có ${pendingBookings[0].count} booking đang chờ xác nhận cho concept ${id}`);
    }

    try {
      // Delete related data in the correct order

      // 1. Delete commission records
      await this.commissionRepository.delete({ serviceConceptId: id });
      this.logger.log(`Đã xóa commission cho concept ${id}`);

      // 2. Delete service concept images
      await this.serviceConceptImageRepository.delete({ serviceConceptId: id });
      this.logger.log(`Đã xóa images cho concept ${id}`);

      // 3. Delete service concept service type relationships
      await this.serviceConceptServiceTypeRepository.delete({ serviceConceptId: id });
      this.logger.log(`Đã xóa service type relationships cho concept ${id}`);

      // 4. Delete concept vector if exists (this would be handled by Gemini service)
      try {
        // Note: This would require implementing a method in GeminiService to delete vectors
        // await this.geminiService.deleteConceptVector(id);
        this.logger.log(`Đã xóa concept vector cho concept ${id}`);
      } catch (error) {
        this.logger.warn(`Không thể xóa concept vector: ${error.message}`);
      }

      // 4.5. Delete concept vector records from database
      await this.dataSource.query(`
        DELETE FROM concept_vector 
        WHERE concept_id = $1
      `, [id]);
      this.logger.log(`Đã xóa concept vector records cho concept ${id}`);

      // 5. Finally delete the service concept
      await this.serviceConceptRepository.remove(serviceConcept);

      this.logger.log(`Khái niệm dịch vụ ${id} đã được xóa thành công trong ${Date.now() - startTime}ms`);
    } catch (error) {
      this.logger.error(`Lỗi khi xóa khái niệm dịch vụ ${id}: ${error.message}`);
      throw new BadRequestException(`Lỗi khi xóa khái niệm dịch vụ: ${error.message}`);
    }
  }
  //#endregion ServiceConcept

  //#region filterServicePackages
  async filterServicePackages(params: {
    name?: string;
    minPrice?: number;
    maxPrice?: number;
    serviceTypeIds?: string[];
    conceptRangeType?: ConceptRangeType;
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
    let havingClause = '';

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
        SELECT sp.id
        FROM service_package sp
        LEFT JOIN service_concept sc ON sc.service_package_id = sp.id
        LEFT JOIN service_concept_service_type sct ON sct.service_concept_id = sc.id
        LEFT JOIN service_type st ON st.id = sct.service_type_id
        LEFT JOIN service_package_prices spp ON spp.id = sp.id
        WHERE 1=1
    `;

    if (params.name) {
      filterConditions.push(`unaccent(sp.name) ILIKE unaccent($${filterConditions.length + 1})`);
      baseParams.push(`%${params.name}%`);
    }

    if (params.status) {
      filterConditions.push(`sp.status = $${filterConditions.length + 1}`);
      baseParams.push(params.status);
    }

    if (params.minPrice !== undefined) {
      // Convert final price to origin price for filtering
      const minOriginPrice = this.calculateOriginPrice(params.minPrice);
      filterConditions.push(`spp.min_price >= $${filterConditions.length + 1}`);
      baseParams.push(minOriginPrice);
    }

    if (params.maxPrice !== undefined) {
      // Convert final price to origin price for filtering
      const maxOriginPrice = this.calculateOriginPrice(params.maxPrice);
      filterConditions.push(`spp.max_price <= $${filterConditions.length + 1}`);
      baseParams.push(maxOriginPrice);
    }

    // Filter by concept range type
    if (params.conceptRangeType) {
      filterConditions.push(`sc.concept_range_type = $${filterConditions.length + 1}`);
      baseParams.push(params.conceptRangeType);
    }

    // Special handling for serviceTypeIds: must match ALL ids
    if (params.serviceTypeIds?.length) {
      filterConditions.push(`st.id IN (${params.serviceTypeIds.map((_, idx) => `$${baseParams.length + idx + 1}`).join(', ')})`);
      baseParams.push(...params.serviceTypeIds);
      havingClause = ` GROUP BY sp.id HAVING COUNT(DISTINCT st.id) = ${params.serviceTypeIds.length}`;
    } else {
      havingClause = ' GROUP BY sp.id';
    }

    // Append filters to the base query
    if (filterConditions.length > 0) {
      baseQuery += ` AND ${filterConditions.join(' AND ')}`;
    }
    baseQuery += `${havingClause}
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
        v.id as vendor_id,
        v.name as vendor_name,
        v.description as vendor_description,
        v.logo as vendor_logo,
        v.status as vendor_status,
        v.slug as vendor_slug,
        v.created_at as vendor_created_at,
        v.updated_at as vendor_updated_at,
        l.id as location_id,
        l.address as location_address,
        l.district as location_district,
        l.ward as location_ward,
        l.city as location_city,
        l.province as location_province,
        l.latitude as location_latitude,
        l.longitude as location_longitude,
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
      LEFT JOIN vendors v ON v.id = sp.vendor_id
      LEFT JOIN locations l ON l.vendor_id = v.id
      LEFT JOIN service_concept sc ON sc.service_package_id = sp.id AND sc.status = 'hoạt động'
      LEFT JOIN service_concept_image sci ON sci.service_concept_id = sc.id
      LEFT JOIN service_concept_service_type sct ON sct.service_concept_id = sc.id
      LEFT JOIN service_type st ON st.id = sct.service_type_id
      GROUP BY 
        sp.id, sp.name, sp.description, sp.image_url, sp.status, sp.created_at, sp.updated_at,
        spp.min_price, spp.max_price, v.id, v.name, v.description, v.logo, v.status, v.slug, v.created_at, v.updated_at,
        l.id, l.address, l.district, l.ward, l.city, l.province, l.latitude, l.longitude,
        sc.id, sc.name, sc.description, sc.price, sc.duration,
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
    let countHavingClause = '';

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
        SELECT sp.id
        FROM service_package sp
        LEFT JOIN service_concept sc ON sc.service_package_id = sp.id
        LEFT JOIN service_concept_service_type sct ON sct.service_concept_id = sc.id
        LEFT JOIN service_type st ON st.id = sct.service_type_id
        LEFT JOIN service_package_prices spp ON spp.id = sp.id
        WHERE 1=1
    `;

    if (params.name) {
      countFilterConditions.push(`unaccent(sp.name) ILIKE unaccent($${countFilterConditions.length + 1})`);
      countParams.push(`%${params.name}%`);
    }

    if (params.status) {
      countFilterConditions.push(`sp.status = $${countFilterConditions.length + 1}`);
      countParams.push(params.status);
    }

    if (params.minPrice !== undefined) {
      // Convert final price to origin price for filtering
      const minOriginPrice = this.calculateOriginPrice(params.minPrice);
      countFilterConditions.push(`spp.min_price >= $${countFilterConditions.length + 1}`);
      countParams.push(minOriginPrice);
    }

    if (params.maxPrice !== undefined) {
      // Convert final price to origin price for filtering
      const maxOriginPrice = this.calculateOriginPrice(params.maxPrice);
      countFilterConditions.push(`spp.max_price <= $${countFilterConditions.length + 1}`);
      countParams.push(maxOriginPrice);
    }

    // Filter by concept range type in count query
    if (params.conceptRangeType) {
      countFilterConditions.push(`sc.concept_range_type = $${countFilterConditions.length + 1}`);
      countParams.push(params.conceptRangeType);
    }

    if (params.serviceTypeIds?.length) {
      countFilterConditions.push(`st.id IN (${params.serviceTypeIds.map((_, idx) => `$${countParams.length + idx + 1}`).join(', ')})`);
      countParams.push(...params.serviceTypeIds);
      countHavingClause = ` GROUP BY sp.id HAVING COUNT(DISTINCT st.id) = ${params.serviceTypeIds.length}`;
    } else {
      countHavingClause = ' GROUP BY sp.id';
    }

    if (countFilterConditions.length > 0) {
      countQuery += ` AND ${countFilterConditions.join(' AND ')}`;
    }
    countQuery += `${countHavingClause}
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
          minPrice: row.min_price ? this.getFinalPrice(Number(parseFloat(row.min_price).toFixed(2))) : null,
          maxPrice: row.max_price ? this.getFinalPrice(Number(parseFloat(row.max_price).toFixed(2))) : null,
          vendor: {
            id: row.vendor_id,
            name: row.vendor_name,
            description: row.vendor_description,
            logo: row.vendor_logo,
            status: row.vendor_status,
            slug: row.vendor_slug,
            createdAt: row.vendor_created_at,
            updatedAt: row.vendor_updated_at,
            locations: new Map<string, any>(),
          },
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
            price: this.getFinalPrice(Number(parseFloat(row.service_concept_price).toFixed(2))),
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

      if (row.location_id) {
        if (!servicePackage.vendor.locations.has(row.location_id)) {
          servicePackage.vendor.locations.set(row.location_id, {
            id: row.location_id,
            address: row.location_address,
            district: row.location_district,
            ward: row.location_ward,
            city: row.location_city,
            province: row.location_province,
            latitude: row.location_latitude,
            longitude: row.location_longitude,
          });
        }
      }
    });

    // After getting the results, slice to only show requested page size
    const servicePackages = Array.from(packagesByServicePackage.values())
      .map(pkg => ({
        ...pkg,
        vendor: {
          ...pkg.vendor,
          locations: Array.from(pkg.vendor.locations.values()),
        },
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
        vendor: {
          ...pkg.vendor,
          locations: Array.from(pkg.vendor.locations.values()),
        },
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
}