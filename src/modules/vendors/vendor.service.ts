import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like, Not, In } from 'typeorm';
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
import { User } from '../users/entities/user.entity';

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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
    this.logger.log('Bắt đầu quá trình tạo nhà cung cấp');

    // Check if user exists and has vendor_owner role
    const user = await this.userRepository.findOne({
      where: { id: createVendorDto.user_id },
      relations: ['role', 'vendor']
    });

    if (!user) {
      this.logger.error(`Không tìm thấy user với ID ${createVendorDto.user_id}`);
      throw new NotFoundException(`Không tìm thấy user với ID ${createVendorDto.user_id}`);
    }

    if (user.role?.id !== 'R008') {
      this.logger.error(`User ${createVendorDto.user_id} không có vai trò vendor_owner`);
      throw new BadRequestException('Chỉ có user với vai trò vendor_owner mới có thể tạo nhà cung cấp');
    }

    // Check if user already has a vendor
    if (user.vendor) {
      this.logger.error(`User ${createVendorDto.user_id} đã có nhà cung cấp`);
      throw new BadRequestException('User đã có nhà cung cấp, không thể tạo thêm');
    }
    
    // Upload file trước khi bắt đầu transaction
    const vendorData: Partial<Vendor> = {
      name: createVendorDto.name,
      description: createVendorDto.description,
      user_id: user,
      status: createVendorDto.status || VendorStatus.ACTIVE,
    };

    // Upload logo
    if (files.logo) {
      this.logger.log('Tải lên logo');
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
          relations: ['category', 'locations', 'servicePackages', 'servicePackages.serviceConcepts', 'servicePackages.serviceConcepts.serviceConceptServiceTypes', 'servicePackages.serviceConcepts.serviceConceptServiceTypes.serviceType', 'servicePackages.serviceConcepts.images', 'user_id', 'user_id.role'],
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
      relations: [
        'category', 
        'locations', 
        'servicePackages', 
        'servicePackages.serviceConcepts', 
        'servicePackages.serviceConcepts.serviceConceptServiceTypes', 
        'servicePackages.serviceConcepts.serviceConceptServiceTypes.serviceType', 
        'servicePackages.serviceConcepts.images',
        'user_id', 
        'user_id.role'
      ],
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
      (acc, pkg) => acc + Number(pkg.serviceConcepts.reduce((acc, concept) => acc + Number(concept.price), 0)), 0,
    );
  
    const averageRating = await reviewService.getAverageRatingByVendorId(id);
  
    const response = new VendorResponseDto();
    response.id = vendor.id;
    response.name = vendor.name;
    response.slug = vendor.slug;
    response.description = vendor.description;
    response.logo = vendor.logo;
    response.banner = vendor.banner;
    response.status = vendor.status;
    response.user_id = vendor.user_id;
    response.category = vendor.category;
    response.locations = vendor.locations.map(loc => ({
      id: loc.id,
      address: loc.address,
      district: loc.district,
      ward: loc.ward,
      city: loc.city,
      province: loc.province,
      latitude: loc.latitude,
      longitude: loc.longitude,
    }));
    response.servicePackages = vendor.servicePackages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      image: pkg.image,
      status: pkg.status,
      vendorId: pkg.vendorId,
      serviceConcepts: pkg.serviceConcepts.map(concept => ({
        id: concept.id,
        name: concept.name,
        description: concept.description,
        images: concept.images.map(img => img.imageUrl),
        price: concept.price,
        duration: concept.duration,
        serviceTypes: concept.serviceConceptServiceTypes.map(sct => ({
          id: sct.serviceType.id,
          name: sct.serviceType.name,
          description: sct.serviceType.description
        }))
      })),
      created_at: pkg.created_at,
      updated_at: pkg.updated_at
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
    queryBuilder.leftJoinAndSelect('service_package.serviceConcepts', 'service_concept');
    queryBuilder.leftJoinAndSelect('service_concept.images', 'service_concept_images');

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
  async findBySlug(slug: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { slug },
      relations: ['category', 'locations', 'servicePackages', 'servicePackages.serviceConcepts', 'servicePackages.serviceConcepts.serviceConceptServiceTypes', 'servicePackages.serviceConcepts.serviceConceptServiceTypes.serviceType', 'servicePackages.serviceConcepts.images'],
    });

    if (!vendor) {
      throw new NotFoundException(`Nhà cung cấp với slug ${slug} không tồn tại`);
    }

    return vendor;
  }
  //#endregion findBySlug

  //#region getVendorByUserID with role 'ROO8'
  async getVendorByUserID(userID: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { user_id: { id: userID } },
    });
    return vendor;
  }
  //#endregion getVendorByUserID with role 'ROO8'

  //#region findAllWithAvailability
  async findAllWithAvailability(date: string, startTime: string, endTime: string): Promise<Vendor[]> {
    const vendors = await this.vendorRepository
      .createQueryBuilder('vendor')
      .leftJoinAndSelect('vendor.availabilities', 'vendor_availability', 
        `vendor_availability.date = :date 
         AND vendor_availability.isAvailable = true 
         AND (
           (vendor_availability.startTime <= :startTime AND vendor_availability.endTime >= :startTime)
           OR (vendor_availability.startTime <= :endTime AND vendor_availability.endTime >= :endTime)
           OR (vendor_availability.startTime >= :startTime AND vendor_availability.endTime <= :endTime)
         )`,
        { date, startTime, endTime }
      )
      .getMany();
  
    // Filter out vendors without availabilities
    return vendors
      .filter(vendor => vendor.availabilities && vendor.availabilities.length > 0)
      .map(vendor => ({
        ...vendor,
        isAvailable: true
      }));
  }
  //#endregion findAllWithAvailability  

  //#region update
  async update(
    id: string,
    updateVendorDto: UpdateVendorDto,
    files: { logo?: Express.Multer.File; banner?: Express.Multer.File; image_url?: Express.Multer.File },
  ): Promise<Vendor> {
    const startTime = Date.now();
    this.logger.log('Bắt đầu quá trình cập nhật nhà cung cấp');

    // Check if vendor exists
    const existingVendor = await this.vendorRepository.findOne({
      where: { id },
      relations: ['category', 'locations', 'user_id', 'user_id.role']
    });

    if (!existingVendor) {
      this.logger.error(`Không tìm thấy nhà cung cấp với ID ${id}`);
      throw new NotFoundException(`Nhà cung cấp với ID ${id} không tồn tại`);
    }

    // Upload files before transaction
    const vendorData: Partial<Vendor> = {};

    if (updateVendorDto.name) {
      vendorData.name = updateVendorDto.name;
    }

    if (updateVendorDto.description !== undefined) {
      vendorData.description = updateVendorDto.description;
    }

    if (updateVendorDto.status !== undefined) {
      vendorData.status = updateVendorDto.status;
    }

    // Upload logo
    if (files.logo) {
      this.logger.log('Tải lên logo mới');
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
      this.logger.log('Tải lên banner mới');
      try {
        const uploadResult = await this.uploadService.uploadImage(files.banner, 'vendors/banners');
        vendorData.banner = uploadResult;
      } catch (error) {
        this.logger.error(`Lỗi khi tải lên banner: ${error.message}`);
        throw new BadRequestException(`Lỗi khi tải lên banner: ${error.message}`);
      }
    }

    // Start transaction
    this.logger.log('Bắt đầu giao dịch cập nhật');
    return this.dataSource.transaction(async (manager) => {
      try {
        const vendorRepo = manager.getRepository(Vendor);
        const categoryRepo = manager.getRepository(Category);
        const locationRepo = manager.getRepository(Location);

        // Update category if provided
        if (updateVendorDto.category_id) {
          this.logger.log('Cập nhật danh mục');
          const category = await categoryRepo.findOne({
            where: { id: updateVendorDto.category_id },
          });
          if (!category) {
            throw new NotFoundException(`Danh mục với ID ${updateVendorDto.category_id} không tồn tại`);
          }
          vendorData.category = category;
        }

        // Generate new slug if name is updated
        if (updateVendorDto.name) {
          this.logger.log('Tạo slug mới');
          vendorData.slug = await this.generateUniqueSlug(vendorRepo, updateVendorDto.name);
        }

        // Update vendor basic info
        Object.assign(existingVendor, vendorData);
        const updatedVendor = await vendorRepo.save(existingVendor);

        // Update locations if provided
        if (updateVendorDto.locations && Array.isArray(updateVendorDto.locations)) {
          this.logger.log('Cập nhật vị trí');
          
          // Remove locations that are not in the update list
          const locationIds = updateVendorDto.locations
            .filter(loc => loc.id)
            .map(loc => loc.id);
          
          await locationRepo.delete({
            vendor: { id: updatedVendor.id },
            id: Not(In(locationIds))
          });

          // Update or create locations
          const locations = await Promise.all(updateVendorDto.locations.map(async loc => {
            if (loc.id) {
              // Update existing location
              const existingLocation = await locationRepo.findOne({
                where: { id: loc.id, vendor: { id: updatedVendor.id } }
              });
              
              if (existingLocation) {
                Object.assign(existingLocation, {
                  address: loc.address,
                  district: loc.district,
                  ward: loc.ward,
                  city: loc.city,
                  province: loc.province,
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                });
                return existingLocation;
              }
            }
            
            // Create new location
            return locationRepo.create({
              ...loc,
              vendor: updatedVendor
            });
          }));

          await locationRepo.save(locations);
        }

        // Fetch and return updated vendor with all relations
        const result = await vendorRepo.findOne({
          where: { id: updatedVendor.id },
          relations: ['category', 'locations', 'servicePackages', 'servicePackages.serviceConcepts', 'servicePackages.serviceConcepts.serviceConceptServiceTypes', 'servicePackages.serviceConcepts.serviceConceptServiceTypes.serviceType', 'servicePackages.serviceConcepts.images', 'user_id', 'user_id.role'],
        });

        this.logger.log(`Cập nhật nhà cung cấp hoàn tất trong ${Date.now() - startTime}ms`);
        return result;
      } catch (error) {
        this.logger.error(`Giao dịch cập nhật thất bại: ${error.message}`);
        throw error;
      }
    });
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
    const locations = await this.locationRepository
      .createQueryBuilder('location')
      .leftJoinAndSelect('location.vendor', 'vendor')
      .leftJoinAndSelect('vendor.category', 'category')
      .leftJoinAndSelect('vendor.servicePackages', 'servicePackages')
      .leftJoinAndSelect('servicePackages.serviceConcepts', 'serviceConcepts')
      .leftJoinAndSelect('serviceConcepts.images', 'images')
      .leftJoinAndSelect('vendor.reviews', 'reviews')
      .where('location.city ILIKE :city', { city: `%${city}%` })
      .getMany();
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
    category?: string;
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
    const pageSize = params.pageSize ? Number(params.pageSize) : 3; // Mặc định pageSize là 3
    const skip = (currentPage - 1) * pageSize;
    const sortDirection = params.sortDirection === 'asc' ? 'ASC' : 'DESC';
    let paramIndex = 1;
    const baseParams: any[] = [];
  
    // Base query for vendor filtering
    let baseQuery = `
      WITH vendor_stats AS (
        SELECT 
          v.id,
          COALESCE(AVG(r.rating), 0) as avg_rating,
          COUNT(r.id) as review_count
        FROM vendors v
        LEFT JOIN review r ON r.vendor_id = v.id
        GROUP BY v.id
      ),
      vendor_prices AS (
        SELECT 
          v.id,
          MIN(sc.price) as min_price,
          MAX(sc.price) as max_price
        FROM vendors v
        LEFT JOIN service_package sp ON sp.vendor_id = v.id AND sp.status = 'hoạt động'
        LEFT JOIN service_concept sc ON sc.service_package_id = sp.id
        GROUP BY v.id
      ),
      vendor_subscriptions AS (
        SELECT 
          v.id,
          COUNT(s.id) as subscription_count,
          RANK() OVER (ORDER BY COUNT(s.id) DESC) as subscription_rank
        FROM vendors v
        LEFT JOIN subscription s ON s.vendor_id = v.id AND s.status = 'hoạt động'
        GROUP BY v.id
      ),
      filtered_vendors AS (
        SELECT DISTINCT v.id
        FROM vendors v
        LEFT JOIN locations l ON l.vendor_id = v.id
        LEFT JOIN category c ON c.id = v.category_id
        WHERE v.status = 'hoạt động'
        ${params.location ? `AND EXISTS (
          SELECT 1 FROM locations l2 
          WHERE l2.vendor_id = v.id 
          AND unaccent(l2.city) ILIKE unaccent($${paramIndex})
        )` : ''}
        ${params.category ? `AND c.id = $${paramIndex}` : ''}
      )
      SELECT DISTINCT 
        v.id,
        v.name,
        v.description,
        v.logo,
        v.banner,
        v.status,
        v.slug,
        v.created_at,
        v.updated_at,
        vs.avg_rating,
        vs.review_count,
        vp.min_price,
        vp.max_price,
        vsub.subscription_count,
        vsub.subscription_rank,
        c.id as category_id,
        c.name as category_name,
        l.id as location_id,
        l.address,
        l.district,
        l.ward,
        l.city,
        l.province,
        l.latitude,
        l.longitude
      FROM filtered_vendors fv
      JOIN vendors v ON v.id = fv.id
      LEFT JOIN locations l ON l.vendor_id = v.id
      LEFT JOIN vendor_stats vs ON vs.id = v.id
      LEFT JOIN vendor_prices vp ON vp.id = v.id
      LEFT JOIN vendor_subscriptions vsub ON vsub.id = v.id
      LEFT JOIN category c ON c.id = v.category_id
    `;
  
    // Add filters to base query
    if (params.name) {
      baseQuery += ` AND unaccent(v.name) ILIKE unaccent($${paramIndex})`;
      baseParams.push(`%${params.name}%`);
      paramIndex++;
    }
  
    if (params.location) {
      baseQuery += ` AND unaccent(l.city) ILIKE unaccent($${paramIndex})`;
      baseParams.push(`%${params.location}%`);
      paramIndex++;
    }
  
    if (params.minPrice !== undefined) {
      baseQuery += ` AND vp.min_price >= $${paramIndex}`;
      baseParams.push(params.minPrice);
      paramIndex++;
    }
    
    if (params.maxPrice !== undefined) {
      baseQuery += ` AND vp.max_price <= $${paramIndex}`;
      baseParams.push(params.maxPrice);
      paramIndex++;
    }
  
    if (params.minRating !== undefined) {
      baseQuery += ` AND vs.avg_rating >= $${paramIndex}`;
      baseParams.push(params.minRating);
      paramIndex++;
    }
    
    if (params.maxRating !== undefined) {
      baseQuery += ` AND vs.avg_rating <= $${paramIndex}`;
      baseParams.push(params.maxRating);
      paramIndex++;
    }

    if (params.category) {
      baseQuery += ` AND c.id = $${paramIndex}`;
      baseParams.push(params.category);
      paramIndex++;
    }
  
    // Add sorting
    switch (params.sortBy) {
      case VendorSortField.SUBSCRIPTION_COUNT:
        baseQuery += ` ORDER BY vsub.subscription_count ${sortDirection} NULLS LAST`;
        break;
      case VendorSortField.PRICE:
        baseQuery += ` ORDER BY vp.min_price ${sortDirection} NULLS LAST`;
        break;
      case VendorSortField.RATING:
        baseQuery += ` ORDER BY vs.avg_rating ${sortDirection} NULLS LAST`;
        break;
      case VendorSortField.NAME:
        baseQuery += ` ORDER BY v.name ${sortDirection}`;
        break;
      default:
        baseQuery += ` ORDER BY vsub.subscription_count ${sortDirection} NULLS LAST, v.created_at DESC`;
    }
  
    // Add pagination to base query
    baseQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    baseParams.push(pageSize, skip);
  
    // Get total count query
    let countQuery = `
      WITH vendor_stats AS (
        SELECT 
          v.id,
          COALESCE(AVG(r.rating), 0) as avg_rating
        FROM vendors v
        LEFT JOIN review r ON r.vendor_id = v.id
        GROUP BY v.id
      ),
      vendor_prices AS (
        SELECT 
          v.id,
          MIN(sc.price) as min_price,
          MAX(sc.price) as max_price
        FROM vendors v
        LEFT JOIN service_package sp ON sp.vendor_id = v.id AND sp.status = 'hoạt động'
        LEFT JOIN service_concept sc ON sc.service_package_id = sp.id
        GROUP BY v.id
      )
      SELECT COUNT(DISTINCT v.id)
      FROM vendors v
      LEFT JOIN locations l ON l.vendor_id = v.id
      LEFT JOIN vendor_stats vs ON vs.id = v.id
      LEFT JOIN vendor_prices vp ON vp.id = v.id
      LEFT JOIN category c ON c.id = v.category_id
      WHERE v.status = 'hoạt động'
    `;
  
    const countParams: any[] = [];
    let countParamIndex = 1;
  
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
      countQuery += ` AND vp.min_price >= $${countParamIndex}`;
      countParams.push(params.minPrice);
      countParamIndex++;
    }
    
    if (params.maxPrice !== undefined) {
      countQuery += ` AND vp.max_price <= $${countParamIndex}`;
      countParams.push(params.maxPrice);
      countParamIndex++;
    }
  
    if (params.minRating !== undefined) {
      countQuery += ` AND vs.avg_rating >= $${countParamIndex}`;
      countParams.push(params.minRating);
      countParamIndex++;
    }
    
    if (params.maxRating !== undefined) {
      countQuery += ` AND vs.avg_rating <= $${countParamIndex}`;
      countParams.push(params.maxRating);
      countParamIndex++;
    }

    if (params.category) {
      countQuery += ` AND c.id = $${countParamIndex}`;
      countParams.push(params.category);
      countParamIndex++;
    }
  
    // Execute queries
    const [vendorData, totalItem] = await Promise.all([
      this.dataSource.query(baseQuery, baseParams),
      this.dataSource.query(countQuery, countParams),
    ]);
  
    if (vendorData.length === 0) {
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
  
    // Fetch service packages and reviews for the filtered vendors
    const vendorIds = vendorData.map(v => v.id);
    const [servicePackages, reviews] = await Promise.all([
      this.dataSource.query(`
        SELECT 
          sp.*,
          sc.id as service_concept_id,
          sc.name as service_concept_name,
          sc.description as service_concept_description,
          sc.price as service_concept_price,
          sc.duration as service_concept_duration,
          COALESCE(ARRAY_AGG(sci.image_url) FILTER (WHERE sci.image_url IS NOT NULL), ARRAY[]::text[]) as service_concept_images
        FROM service_package sp
        LEFT JOIN service_concept sc ON sc.service_package_id = sp.id
        LEFT JOIN service_concept_image sci ON sci.service_concept_id = sc.id
        WHERE sp.vendor_id = ANY($1) AND sp.status = 'hoạt động'
        GROUP BY sp.id, sc.id, sc.name, sc.description, sc.price, sc.duration
        ORDER BY sp.id, sc.id
        `, [vendorIds]),
      this.dataSource.query(`
        SELECT *
        FROM review
        WHERE vendor_id = ANY($1)
        ORDER BY created_at DESC
      `, [vendorIds])
    ]);
  
    // Group service packages and reviews by vendor
    const servicePackagesByVendor = new Map();
    const reviewsByVendor = new Map();
  
    servicePackages.forEach((row: any) => {
      if (!servicePackagesByVendor.has(row.vendor_id)) {
        servicePackagesByVendor.set(row.vendor_id, new Map());
      }
      const vendorPackages = servicePackagesByVendor.get(row.vendor_id);
      
      if (!vendorPackages.has(row.id)) {
        vendorPackages.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          status: row.status,
          serviceConcepts: []
        });
      }
  
      if (row.service_concept_id) {
        const pkg = vendorPackages.get(row.id);
        pkg.serviceConcepts.push({
          id: row.service_concept_id,
          name: row.service_concept_name,
          description: row.service_concept_description,
          price: row.service_concept_price,
          duration: row.service_concept_duration,
          images: Array.isArray(row.service_concept_images) ? row.service_concept_images : []
        });
      }
    });
  
    reviews.forEach((review: any) => {
      if (!reviewsByVendor.has(review.vendor_id)) {
        reviewsByVendor.set(review.vendor_id, []);
      }
      reviewsByVendor.get(review.vendor_id).push({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at
      });
    });
  
    // Group locations by vendor ID before mapping
    const locationsByVendor = new Map();
    vendorData.forEach((row: any) => {
      if (row.location_id) {
        if (!locationsByVendor.has(row.id)) {
          locationsByVendor.set(row.id, []);
        }
        locationsByVendor.get(row.id).push({
          id: row.location_id,
          address: row.address || '',
          district: row.district || '',
          ward: row.ward || '',
          city: row.city || '',
          province: row.province || '',
          latitude: row.latitude ? Number(parseFloat(row.latitude).toFixed(6)) : null,
          longitude: row.longitude ? Number(parseFloat(row.longitude).toFixed(6)) : null
        });
      }
    });
  
    // Map vendors without filtering duplicates
    const vendors = vendorData.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      logo: row.logo || null,
      banner: row.banner || null,
      status: row.status,
      slug: row.slug,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      averageRating: Number(parseFloat(row.avg_rating || 0).toFixed(1)),
      reviewCount: parseInt(row.review_count) || 0,
      minPrice: row.min_price ? Number(parseFloat(row.min_price).toFixed(2)) : null,
      maxPrice: row.max_price ? Number(parseFloat(row.max_price).toFixed(2)) : null,
      subscriptionCount: parseInt(row.subscription_count) || 0,
      isRemarkable: row.subscription_rank <= 3, // Vendor is remarkable if they are in top 3 by subscription count
      locations: locationsByVendor.get(row.id) || [],
      servicePackages: Array.from(servicePackagesByVendor.get(row.id)?.values() || []),
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name
      } : null,
      reviews: reviewsByVendor.get(row.id) || []
    }));
  
    const totalPage = Math.ceil(Number(totalItem[0].count) / pageSize);
  
    return {
      data: vendors,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage,
        totalItem: Number(totalItem[0].count),
      },
    };
  }
  //#endregion filterVendors
}