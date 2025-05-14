import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { Category } from '../categories/entities/category.entity';
import { VendorStatus } from 'src/constants/vendor.enum';
import { Location } from '../locations/entities/location.entity';
import { VendorManager } from './entities/vendor-manager.entity';
import { VendorLike } from './entities/vendor-like.entity';
import { VendorAvailability } from './entities/vendor-availability.entity';
import { CreateVendorDto, CreateVendorManagerDto, CreateVendorLikeDto, CreateVendorAvailabilityDto } from './dto/create-vendor.dto';
import { FindVendorDto } from './dto/find-vendor.dto';
import { slugify } from 'src/utils/utils';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { UploadService } from 'src/3rdService/upload/upload.service'; // Assuming you have an UploadService for handling file uploads
import { VendorResponseDto } from './dto/response/vendor-response.dto';
import { ReviewService } from '../reviews/reviews.service'; // Assuming you have a ReviewService for handling reviews
import { VendorSortField } from 'src/constants/vendor.enum';

@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);

  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(VendorManager)
    private readonly vendorManagerRepository: Repository<VendorManager>,
    @InjectRepository(VendorLike)
    private readonly vendorLikeRepository: Repository<VendorLike>,
    @InjectRepository(VendorAvailability)
    private readonly vendorAvailabilityRepository: Repository<VendorAvailability>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    private readonly dataSource: DataSource,
    private readonly uploadService: UploadService,
    private readonly reviewService: ReviewService,
  ) { }

  //#region CreateVendor
  async create(
    createVendorDto: CreateVendorDto,
    files: { logo?: Express.Multer.File; banner?: Express.Multer.File; image_url?: Express.Multer.File },
  ): Promise<Vendor> {
    const startTime = Date.now();
    this.logger.log('Starting create vendor process');

    // Upload file trước khi bắt đầu transaction
    const vendorData: Partial<Vendor> = {
      name: createVendorDto.name,
      description: createVendorDto.description,
      status: createVendorDto.status || VendorStatus.ACTIVE,
    };

    // Upload logo
    if (files.logo) {
      this.logger.log('Uploading logo');
      try {
        const uploadResult = await this.uploadService.uploadImage(files.logo, 'vendors/logos');
        vendorData.logo = uploadResult;
      } catch (error) {
        this.logger.error(`Lỗi khi tải lên logo: ${error.message}`);
        throw new BadRequestException(`Lỗi khi tải lên logo: ${error.message}`);
      }
    }

    // Upload banner
    if (files.banner) {
      this.logger.log('Uploading banner');
      try {
        const uploadResult = await this.uploadService.uploadImage(files.banner, 'vendors/banners');
        vendorData.banner = uploadResult;
      } catch (error) {
        this.logger.error(`Lỗi khi tải lên banner: ${error.message}`);
        throw new BadRequestException(`Lỗi khi tải lên banner: ${error.message}`);
      }
    }

    // Bắt đầu transaction sau khi upload file
    this.logger.log('Starting database transaction');
    return this.dataSource.transaction(async (manager) => {
      try {
        const categoryRepo = manager.getRepository(Category);
        const vendorRepo = manager.getRepository(Vendor);
        const locationRepo = manager.getRepository(Location);

        this.logger.log('Fetching category');
        const category = await categoryRepo.findOne({
          where: { id: createVendorDto.category_id },
        });
        if (!category) {
          throw new NotFoundException(`Danh mục với ID ${createVendorDto.category_id} không tồn tại`);
        }

        this.logger.log('Generating unique slug');
        const uniqueSlug = await this.generateUniqueSlug(vendorRepo, createVendorDto.name);

        const vendor = vendorRepo.create({
          ...vendorData,
          slug: uniqueSlug,
          category,
        });

        this.logger.log('Saving vendor');
        const savedVendor = await vendorRepo.save(vendor);

        if (createVendorDto.locations && Array.isArray(createVendorDto.locations) && createVendorDto.locations.length > 0) {
          this.logger.log('Saving locations');
          this.logger.log(`Parsed locations: ${JSON.stringify(createVendorDto.locations)}`);

          const locations = createVendorDto.locations.map((locationDto, index) => {
            if (!locationDto.address) {
              throw new BadRequestException(`Địa chỉ là bắt buộc cho vị trí thứ ${index}`);
            }
            const location = locationRepo.create({
              address: locationDto.address,
              district: locationDto.district,
              ward: locationDto.ward,
              city: locationDto.city,
              province: locationDto.province,
              latitude: locationDto.latitude,
              longitude: locationDto.longitude,
              vendor: savedVendor,
            });
            return location;
          });

          this.logger.log(`Mapped locations for saving: ${JSON.stringify(locations)}`);
          await locationRepo.save(locations);
        } else {
          this.logger.warn('Không có vị trí hợp lệ được cung cấp');
        }

        this.logger.log('Fetching saved vendor with relations');
        const result = await vendorRepo.findOne({
          where: { id: savedVendor.id },
          relations: ['category', 'locations'],
        });

        this.logger.log(`Tạo nhà cung cấp hoàn tất trong ${Date.now() - startTime}ms`);
        return result;
      } catch (error) {
        this.logger.error(`Giao dịch thất bại: ${error.message}`);
        throw error;
      }
    });
  }
  //#endregion CreateVendor

  //#region findOne
  async findOne(id: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { id },
      relations: ['category', 'locations', 'servicePackages'],
    });
    if (!vendor) {
      throw new NotFoundException(`Nhà cung cấp với ID ${id} không tồn tại`);
    }
    return vendor;
  }
  //#endregion findOne

  //#region getvendorResponse
  async getVendorResponse(id: string, reviewService: ReviewService): Promise<VendorResponseDto> {
    const vendor = await this.findOne(id);
  
    const totalPrice = vendor.servicePackages.reduce(
      (acc, pkg) => acc + Number(pkg.price), 0,
    );
  
    const averageRating = await reviewService.getAverageRatingByVendorId(id);
  
    const response = new VendorResponseDto();
    response.name = vendor.name;
    response.slug = vendor.slug;
    response.description = vendor.description;
    response.logo = vendor.logo;
    response.banner = vendor.banner;
    response.status = vendor.status;
    response.category = vendor.category;
    response.locations = vendor.locations.map(loc => ({
      address: loc.address,
      district: loc.district,
      ward: loc.ward,
      city: loc.city,
      province: loc.province,
      latitude: loc.latitude,
      longitude: loc.longitude,
    }));
    response.servicePackages = vendor.servicePackages.map(pkg => ({
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      duration: pkg.duration,
    }));
    response.totalPrice = totalPrice;
    response.averageRating = averageRating;
  
    return response;
  }
  //#endregion getvendorResponse  

  //#region findAll
  async findAll(query: FindVendorDto): Promise<{
    data: Vendor[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const currentPage = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;

    const queryBuilder = this.vendorRepository.createQueryBuilder('vendor');
    queryBuilder.leftJoinAndSelect('vendor.category', 'category');
    queryBuilder.leftJoinAndSelect('vendor.locations', 'locations');
    queryBuilder.leftJoinAndSelect('vendor.servicePackages', 'service_package');

    if (query.term) {
      queryBuilder.andWhere(
        `(unaccent(vendor.name) ILIKE unaccent(:term) OR unaccent(vendor.slug) ILIKE unaccent(:term))`,
        { term: `%${query.term}%` },
      );
    }

    if (query.status) {
      queryBuilder.andWhere('vendor.status = :status', { status: query.status });
    }

    const allowedSortFields = ['created_at', 'updated_at', 'name', 'slug'];
    const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'created_at';
    const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';

    queryBuilder.orderBy(`vendor.${sortField}`, sortDirection);
    queryBuilder.skip(skip).take(pageSize);

    const [data, totalItem] = await queryBuilder.getManyAndCount();
    const totalPage = Math.ceil(totalItem / pageSize);

    return {
      data,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage,
        totalItem,
      },
    };
  }
  //#endregion findAll

  //#region findBySlug
  async findBySlug(slug: string): Promise<VendorResponseDto> {
    const vendor = await this.vendorRepository.findOne({
      where: { slug },
      relations: ['category', 'locations', 'servicePackages', 'reviews'],
    });
  
    if (!vendor) {
      throw new NotFoundException(`Nhà cung cấp với slug ${slug} không tồn tại`);
    }

    return this.getVendorResponse(vendor.id, this.reviewService);
  }
  //#endregion findBySlug

  //#region findAllWithAvailability
  async findAllWithAvailability(date: string, startTime: string, endTime: string): Promise<Vendor[]> {
    const vendors = await this.vendorRepository
      .createQueryBuilder('vendor')
      .leftJoinAndSelect('vendor.availabilities', 'vendor_availability', 
        'vendor_availability.date = :date AND vendor_availability.isAvailable = true AND vendor_availability.startTime <= :startTime AND vendor_availability.endTime >= :endTime',
        { date, startTime, endTime }
      )
      .getMany();
  
    // Optionally: map isAvailable
    return vendors.map(vendor => ({
      ...vendor,
      isAvailable: vendor.availabilities.length > 0,
    }));
  }
  //#endregion findAllWithAvailability  

  //#region update
  async update(
    id: string,
    updateVendorDto: UpdateVendorDto,
    files: { logo?: Express.Multer.File; banner?: Express.Multer.File; image_url?: Express.Multer.File },
  ): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({ where: { id } });
  
    if (!vendor) {
      throw new NotFoundException(`Nhà cung cấp với ID ${id} không tồn tại`);
    }
  
    // Update các field đơn giản nếu được truyền vào
    if (updateVendorDto.name) {
      vendor.name = updateVendorDto.name;
      vendor.slug = await this.generateUniqueSlug(this.vendorRepository, updateVendorDto.name);
    }
  
    if (updateVendorDto.description !== undefined) {
      vendor.description = updateVendorDto.description;
    }
  
    if (updateVendorDto.status !== undefined) {
      vendor.status = updateVendorDto.status;
    }
  
    // Upload ảnh nếu có truyền vào
    if (files.logo) {
      const uploadedLogo = await this.uploadService.uploadImage(files.logo, 'vendors/logos');
      vendor.logo = uploadedLogo;
    }
  
    if (files.banner) {
      const uploadedBanner = await this.uploadService.uploadImage(files.banner, 'vendors/banners');
      vendor.banner = uploadedBanner;
    }
  
    return this.vendorRepository.save(vendor);
  }  
  //#endregion update

  //#region remove
  async remove(id: string): Promise<void> {
    const vendor = await this.vendorRepository.findOne({ where: { id } });
    if (!vendor) {
      throw new NotFoundException(`Nhà cung cấp với ID ${id} không tồn tại`);
    }

    await this.vendorRepository.remove(vendor);
  }
  //#endregion remove

  //#region VendorManager
  async addManager(createVendorManagerDto: CreateVendorManagerDto): Promise<void> {
    const manager = this.vendorManagerRepository.create(createVendorManagerDto);
    await this.vendorManagerRepository.save(manager);
  }
  //#endregion VendorManager

  //#region VendorLike
  async likeVendor(createVendorLikeDto: CreateVendorLikeDto): Promise<void> {
    const like = this.vendorLikeRepository.create(createVendorLikeDto);
    await this.vendorLikeRepository.save(like);
  }
  //#endregion VendorLike

  //#region VendorAvailability
  async addAvailability(createVendorAvailabilityDto: CreateVendorAvailabilityDto): Promise<void> {
    const availability = this.vendorAvailabilityRepository.create(createVendorAvailabilityDto);
    await this.vendorAvailabilityRepository.save(availability);
  }
  //#endregion VendorAvailability

  //#region Utility
  private async generateUniqueSlug(
    vendorRepo: Repository<Vendor>,
    name: string,
  ): Promise<string> {
    const baseSlug = slugify(name);

    const existingVendors = await vendorRepo.find({
      select: ['slug'],
      where: { slug: Like(`${baseSlug}%`) },
    });
    const existingSlugs = existingVendors.map((vendor) => vendor.slug);

    if (!existingSlugs.includes(baseSlug)) {
      return baseSlug;
    }

    let maxSuffix = 0;
    for (const slug of existingSlugs) {
      const parts = slug.split('-');
      const lastPart = parts[parts.length - 1];
      const suffix = parseInt(lastPart, 10);
      if (!isNaN(suffix)) {
        maxSuffix = Math.max(maxSuffix, suffix);
      }
    }

    return `${baseSlug}-${maxSuffix + 1}`;
  }
  //#endregion Utility

  //#region SearchLocations with City only link with vendor
  async searchLocationsWithCity(city: string): Promise<Location[]> {
    const locations = await this.locationRepository.find({
      where: { city },
      relations: ['vendor', 'vendor.category', 'vendor.servicePackages', 'vendor.reviews'],
    });
    return locations;
  }
  //#endregion SearchLocations with City only link with vendor

  //#region filterVendors
  async filterVendors(params: {
    name?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    maxRating?: number;
    current?: string;
    pageSize?: string;
    sortBy?: VendorSortField;
    sortDirection?: 'asc' | 'desc';
  }): Promise<{
    data: Vendor[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const currentPage = params.current ? Number(params.current) : 1;
    const pageSize = params.pageSize ? Number(params.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;
    const sortDirection = params.sortDirection === 'asc' ? 'ASC' : 'DESC';

    let query = `
      WITH vendor_stats AS (
        SELECT 
          v.id,
          COALESCE(AVG(r.rating), 0) as avg_rating
        FROM vendors v
        LEFT JOIN review r ON r.vendor_id = v.id
        GROUP BY v.id
      ),
      vendor_data AS (
        SELECT DISTINCT
          v.*,
          vs.avg_rating,
          l.id as location_id,
          l.address,
          l.district,
          l.ward,
          l.city,
          l.province,
          l.latitude,
          l.longitude,
          c.id as category_id,
          c.name as category_name
        FROM vendors v
        LEFT JOIN vendor_stats vs ON vs.id = v.id
        LEFT JOIN locations l ON l.vendor_id = v.id
        LEFT JOIN category c ON c.id = v.category_id
        WHERE v.status = 'hoạt động'
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    // Add name filter
    if (params.name) {
      query += ` AND unaccent(v.name) ILIKE unaccent($${paramIndex})`;
      queryParams.push(`%${params.name}%`);
      paramIndex++;
    }

    // Add location filter
    if (params.location) {
      query += ` AND unaccent(l.city) ILIKE unaccent($${paramIndex})`;
      queryParams.push(`%${params.location}%`);
      paramIndex++;
    }

    // Add price filters
    if (params.minPrice !== undefined) {
      query += ` AND (
        CASE 
          WHEN $${paramIndex} > 0 THEN
            EXISTS (
              SELECT 1 FROM service_package sp 
              WHERE sp.vendor_id = v.id 
              AND sp.status = 'hoạt động'
              AND sp.price > 0
            )
            AND NOT EXISTS (
              SELECT 1 FROM service_package sp 
              WHERE sp.vendor_id = v.id 
              AND sp.status = 'hoạt động'
              AND sp.price < $${paramIndex}
            )
          ELSE
            NOT EXISTS (
              SELECT 1 FROM service_package sp 
              WHERE sp.vendor_id = v.id 
              AND sp.status = 'hoạt động'
              AND sp.price < $${paramIndex}
            )
        END
      )`;
      queryParams.push(params.minPrice);
      paramIndex++;
    }
    if (params.maxPrice !== undefined) {
      query += ` AND (
        CASE 
          WHEN $${paramIndex} > 0 THEN
            EXISTS (
              SELECT 1 FROM service_package sp 
              WHERE sp.vendor_id = v.id 
              AND sp.status = 'hoạt động'
              AND sp.price > 0
            )
            AND NOT EXISTS (
              SELECT 1 FROM service_package sp 
              WHERE sp.vendor_id = v.id 
              AND sp.status = 'hoạt động'
              AND sp.price > $${paramIndex}
            )
          ELSE
            NOT EXISTS (
              SELECT 1 FROM service_package sp 
              WHERE sp.vendor_id = v.id 
              AND sp.status = 'hoạt động'
              AND sp.price > $${paramIndex}
            )
        END
      )`;
      queryParams.push(params.maxPrice);
      paramIndex++;
    }

    // Add rating filters
    if (params.minRating !== undefined) {
      query += ` AND vs.avg_rating >= $${paramIndex}`;
      queryParams.push(params.minRating);
      paramIndex++;
    }
    if (params.maxRating !== undefined) {
      query += ` AND vs.avg_rating <= $${paramIndex}`;
      queryParams.push(params.maxRating);
      paramIndex++;
    }

    query += `) 
    SELECT 
      vd.*,
      sp.id as service_package_id,
      sp.name as service_package_name,
      sp.description as service_package_description,
      sp.price as service_package_price,
      sp.duration as service_package_duration,
      sp.status as service_package_status,
      r.id as review_id,
      r.rating as review_rating,
      r.comment as review_comment
    FROM vendor_data vd
    LEFT JOIN service_package sp ON sp.vendor_id = vd.id AND sp.status = 'hoạt động'
    LEFT JOIN review r ON r.vendor_id = vd.id`;

    // Add sorting
    switch (params.sortBy) {
      case VendorSortField.PRICE:
        query += ` ORDER BY vd.id, COALESCE(sp.price, 0) ${sortDirection} NULLS LAST`;
        break;
      case VendorSortField.RATING:
        query += ` ORDER BY vd.id, vd.avg_rating ${sortDirection} NULLS LAST`;
        break;
      case VendorSortField.NAME:
        query += ` ORDER BY vd.id, vd.name ${sortDirection}`;
        break;
      default:
        query += ` ORDER BY vd.id, vd.created_at DESC`;
    }

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(pageSize, skip);

    // Get total count
    let countQuery = `
      WITH vendor_ratings AS (
        SELECT 
          v.id,
          COALESCE(AVG(r.rating), 0) as avg_rating
        FROM vendors v
        LEFT JOIN review r ON r.vendor_id = v.id
        GROUP BY v.id
      )
      SELECT COUNT(DISTINCT v.id)
      FROM vendors v
      LEFT JOIN locations l ON l.vendor_id = v.id
      LEFT JOIN vendor_ratings vr ON vr.id = v.id
      WHERE v.status = 'hoạt động'
    `;

    const countParams: any[] = [];
    let countParamIndex = 1;

    // Add the same filters to count query
    if (params.name) {
      countQuery += ` AND unaccent(v.name) ILIKE unaccent($${countParamIndex})`;
      countParams.push(`%${params.name}%`);
      countParamIndex++;
    }

    if (params.location) {
      countQuery += ` AND unaccent(l.city) ILIKE unaccent($${countParamIndex})`;
      countParams.push(`%${params.location}%`);
      countParamIndex++;
    }

    if (params.minPrice !== undefined) {
      countQuery += ` AND (
        CASE 
          WHEN $${countParamIndex} > 0 THEN
            EXISTS (
              SELECT 1 FROM service_package sp 
              WHERE sp.vendor_id = v.id 
              AND sp.status = 'hoạt động'
              AND sp.price > 0
            )
            AND NOT EXISTS (
              SELECT 1 FROM service_package sp 
              WHERE sp.vendor_id = v.id 
              AND sp.status = 'hoạt động'
              AND sp.price < $${countParamIndex}
            )
          ELSE
            NOT EXISTS (
              SELECT 1 FROM service_package sp 
              WHERE sp.vendor_id = v.id 
              AND sp.status = 'hoạt động'
              AND sp.price < $${countParamIndex}
            )
        END
      )`;
      countParams.push(params.minPrice);
      countParamIndex++;
    }
    if (params.maxPrice !== undefined) {
      countQuery += ` AND (
        CASE 
          WHEN $${countParamIndex} > 0 THEN
            EXISTS (
              SELECT 1 FROM service_package sp 
              WHERE sp.vendor_id = v.id 
              AND sp.status = 'hoạt động'
              AND sp.price > 0
            )
            AND NOT EXISTS (
              SELECT 1 FROM service_package sp 
              WHERE sp.vendor_id = v.id 
              AND sp.status = 'hoạt động'
              AND sp.price > $${countParamIndex}
            )
          ELSE
            NOT EXISTS (
              SELECT 1 FROM service_package sp 
              WHERE sp.vendor_id = v.id 
              AND sp.status = 'hoạt động'
              AND sp.price > $${countParamIndex}
            )
        END
      )`;
      countParams.push(params.maxPrice);
      countParamIndex++;
    }

    if (params.minRating !== undefined) {
      countQuery += ` AND vr.avg_rating >= $${countParamIndex}`;
      countParams.push(params.minRating);
      countParamIndex++;
    }
    if (params.maxRating !== undefined) {
      countQuery += ` AND vr.avg_rating <= $${countParamIndex}`;
      countParams.push(params.maxRating);
      countParamIndex++;
    }

    // Execute queries
    const [data, totalItem] = await Promise.all([
      this.dataSource.query(query, queryParams),
      this.dataSource.query(countQuery, countParams)
    ]);

    const totalPage = Math.ceil(totalItem[0].count / pageSize);

    // Group service packages and reviews by vendor
    const vendorMap = new Map();
    data.forEach(row => {
      if (!vendorMap.has(row.id)) {
        vendorMap.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          logo: row.logo,
          banner: row.banner,
          status: row.status,
          slug: row.slug,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          averageRating: row.avg_rating || 0,
          locations: row.location_id ? [{
            id: row.location_id,
            address: row.address,
            district: row.district,
            ward: row.ward,
            city: row.city,
            province: row.province,
            latitude: row.latitude,
            longitude: row.longitude
          }] : [],
          servicePackages: [],
          category: row.category_id ? {
            id: row.category_id,
            name: row.category_name
          } : null,
          reviews: []
        });
      }

      const vendor = vendorMap.get(row.id);
      
      // Add service package if it exists and not already added
      if (row.service_package_id && !vendor.servicePackages.some(sp => sp.id === row.service_package_id)) {
        vendor.servicePackages.push({
          id: row.service_package_id,
          name: row.service_package_name,
          description: row.service_package_description,
          price: row.service_package_price,
          duration: row.service_package_duration,
          status: row.service_package_status
        });
      }

      // Add review if it exists and not already added
      if (row.review_id && !vendor.reviews.some(r => r.id === row.review_id)) {
        vendor.reviews.push({
          id: row.review_id,
          rating: row.review_rating,
          comment: row.review_comment
        });
      }
    });

    return {
      data: Array.from(vendorMap.values()),
      pagination: {
        current: currentPage,
        pageSize,
        totalPage,
        totalItem: Number(totalItem[0].count)
      }
    };
  }
  //#endregion filterVendors
}