import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like, Not, In, ILike } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { Category } from '../categories/entities/category.entity';
import { VendorStatus } from 'src/constants/vendor.enum';
import { Location } from '../locations/entities/location.entity';
import { VendorManager } from './entities/vendor-manager.entity';
import { VendorLike } from './entities/vendor-like.entity';
import { CreateVendorDto, CreateVendorManagerDto, CreateVendorLikeDto } from './dto/create-vendor.dto';
import { FindVendorDto } from './dto/find-vendor.dto';
import { slugify } from 'src/utils/utils';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { UploadService } from 'src/3rdService/upload/upload.service';
import { VendorResponseDto } from './dto/response/vendor-response.dto';
import { ReviewService } from '../reviews/reviews.service';
import { VendorSortField } from 'src/constants/vendor.enum';
import { User } from '../users/entities/user.entity';
import { FilterVendorDto, RemarkableVendorDto } from './dto/filter-vendor.dto';
import { CreateLocationDto } from '../locations/dto/create-location.dto';
import { GoongService } from 'src/3rdService/goong/goong.service';
import { CampaignVendor } from '../campaign/entities/campaign-vendor.entity';
import { Campaign } from '../campaign/entities/campaign.entity';
import { ServicePackageService } from '../service-package/service-package.service';


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
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CampaignVendor)
    private readonly campaignVendorRepository: Repository<CampaignVendor>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    private readonly dataSource: DataSource,
    private readonly uploadService: UploadService,
    private readonly reviewService: ReviewService,
    private readonly goongService: GoongService,
    private readonly servicePackageService: ServicePackageService,
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
        const campaignVendorRepo = manager.getRepository(CampaignVendor);
        const campaignRepo = manager.getRepository(Campaign);

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

        if (createVendorDto.location) {
          this.logger.log('Processing location with geocoding');
          this.logger.log(`Parsed location: ${JSON.stringify(createVendorDto.location)}`);

          if (!createVendorDto.location.address) {
            throw new BadRequestException('Địa chỉ là bắt buộc cho vị trí');
          }

          // Process location with geocoding
          const processedLocation = await this.processLocationWithGeocoding(createVendorDto.location);

          const location = locationRepo.create({
            address: processedLocation.address,
            district: processedLocation.district,
            ward: processedLocation.ward,
            city: processedLocation.city,
            province: processedLocation.province,
            latitude: processedLocation.latitude,
            longitude: processedLocation.longitude,
            vendor: savedVendor,
          });

          this.logger.log(`Saving location: ${JSON.stringify(location)}`);
          const savedLocation = await locationRepo.save(location);

          // Tạo vendor-album cho location nếu chưa có
          const vendorAlbumRepo = manager.getRepository('VendorAlbum');
          let vendorAlbum = await vendorAlbumRepo.findOne({ where: { location: { id: savedLocation.id } } });
          if (!vendorAlbum) {
            vendorAlbum = vendorAlbumRepo.create({ location: savedLocation });
            await vendorAlbumRepo.save(vendorAlbum);
          }
        } else {
          this.logger.warn('Không có vị trí được cung cấp');
        }

        this.logger.log('Fetching saved vendor with relations');
        const result = await vendorRepo.findOne({
          where: { id: savedVendor.id },
          relations: ['category', 'locations', 'servicePackages', 'servicePackages.serviceConcepts', 'servicePackages.serviceConcepts.serviceConceptServiceTypes', 'servicePackages.serviceConcepts.serviceConceptServiceTypes.serviceType', 'servicePackages.serviceConcepts.images', 'user_id', 'user_id.role'],
        });

        this.logger.log(`Tạo nhà cung cấp hoàn tất trong ${Date.now() - startTime}ms`);

        // Gán campaign chào bạn mới tự động khi tạo vendor mới
        const campaign = await campaignRepo.findOne({ where: { name: 'Chào bạn mới' } });
        if (campaign) {
          let campaignVendor = await campaignVendorRepo.findOne({ where: { campaign: { id: campaign.id } }, relations: ['vendor'] });
          if (campaignVendor) {
            campaignVendor.vendor = savedVendor;
            campaignVendor.isAvailable = true;
            campaignVendor.invited = true;
            await campaignVendorRepo.save(campaignVendor);
          } else {
            campaignVendor = campaignVendorRepo.create({ campaign, vendor: savedVendor, isAvailable: true, invited: true });
            await campaignVendorRepo.save(campaignVendor);
          }
        }

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
    const vendor = await this.vendorRepository
      .createQueryBuilder('vendor')
      .select([
        'vendor',
        'category.id',
        'category.name',
        'locations',
        'servicePackages',
        'serviceConcepts',
        'serviceConceptServiceTypes',
        'serviceType',
        'images',
        'user_id',
        'role'
      ])
      .leftJoin('vendor.category', 'category')
      .leftJoin('vendor.locations', 'locations')
      .leftJoin('vendor.servicePackages', 'servicePackages')
      .leftJoin('servicePackages.serviceConcepts', 'serviceConcepts')
      .leftJoin('serviceConcepts.serviceConceptServiceTypes', 'serviceConceptServiceTypes')
      .leftJoin('serviceConceptServiceTypes.serviceType', 'serviceType')
      .leftJoin('serviceConcepts.images', 'images')
      .leftJoin('vendor.user_id', 'user_id')
      .leftJoin('user_id.role', 'role')
      .where('vendor.id = :id', { id })
      .orderBy('servicePackages.created_at', 'DESC')
      .getOne();

    if (!vendor) {
      throw new NotFoundException(`Nhà cung cấp với ID ${id} không tồn tại`);
    }
    return vendor;
  }
  //#endregion findOne

  //#region getvendorResponse
  async getVendorResponse(id: string, reviewService: ReviewService): Promise<VendorResponseDto> {
    const vendor = await this.findOne(id);

    // Calculate total price using the new pricing logic
    let totalPrice = 0;
    for (const pkg of vendor.servicePackages) {
      for (const concept of pkg.serviceConcepts) {
        // Get the final price (what customer sees) using service package service
        try {
          const conceptWithFinalPrice = await this.servicePackageService.findServiceConcept(concept.id);
          totalPrice += conceptWithFinalPrice.price; // This is already the final price
        } catch (error) {
          this.logger.warn(`Could not get final price for concept ${concept.id}: ${error.message}`);
          // Fallback to original price if service fails
          totalPrice += concept.price;
        }
      }
    }

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

    // Map service packages with final prices
    response.servicePackages = await Promise.all(vendor.servicePackages.map(async pkg => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      image: pkg.image,
      status: pkg.status,
      vendorId: pkg.vendorId,
      serviceConcepts: await Promise.all(pkg.serviceConcepts.map(async concept => {
        // Get the final price for each concept
        let finalPrice = concept.price; // Fallback to original price
        try {
          const conceptWithFinalPrice = await this.servicePackageService.findServiceConcept(concept.id);
          finalPrice = conceptWithFinalPrice.price; // This is the final price customer sees
        } catch (error) {
          this.logger.warn(`Could not get final price for concept ${concept.id}: ${error.message}`);
        }

        return {
          id: concept.id,
          name: concept.name,
          description: concept.description,
          images: concept.images.map(img => img.imageUrl),
          price: finalPrice,
          duration: concept.duration,
          conceptRangeType: concept.conceptRangeType,
          numberOfDays: concept.numberOfDays,
          serviceTypes: concept.serviceConceptServiceTypes.map(sct => ({
            id: sct.serviceType.id,
            name: sct.serviceType.name,
            description: sct.serviceType.description
          }))
        };
      })),
      created_at: pkg.created_at,
      updated_at: pkg.updated_at
    })));

    response.totalPrice = totalPrice;
    response.averageRating = averageRating;

    // Get priority status
    const subscriptionData = await this.dataSource.query(`
      SELECT 
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM subscription_vendor sv2 
            JOIN subscription_plan sp ON sp.id = sv2.plan_id 
            WHERE sv2.vendor_id = $1 
            AND sv2.is_active = true
            AND sp.price = (
              SELECT MAX(price) FROM subscription_plan WHERE is_active = true
            )
          ) THEN true 
          ELSE false 
        END as priority
    `, [id]);

    // Get isRemarkable status
    const campaignData = await this.dataSource.query(`
      SELECT 
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM campaign_vendor cv
            JOIN campaign c ON c.id = cv.campaign_id
            JOIN user_campaign uc ON uc.campaign_id = c.id
            WHERE cv.vendor_id = $1 
            AND cv.is_available = true
            AND c.status = true
            AND uc.isavailable = true
            GROUP BY cv.campaign_id
            HAVING COUNT(uc.user_id) >= 5
          ) THEN true 
          ELSE false 
        END as is_remarkable
    `, [id]);

    response.priority = subscriptionData[0]?.priority === true;
    response.isRemarkable = campaignData[0]?.is_remarkable === true;

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

    const queryBuilder = this.vendorRepository
      .createQueryBuilder('vendor')
      .select([
        'vendor',
        'category.id',
        'category.name',
        'locations',
        'servicePackages',
        'serviceConcepts',
        'serviceConceptServiceTypes',
        'serviceType',
        'images',
        'user_id',
        'role'
      ])
      .leftJoin('vendor.category', 'category')
      .leftJoin('vendor.locations', 'locations')
      .leftJoin('vendor.servicePackages', 'servicePackages')
      .leftJoin('servicePackages.serviceConcepts', 'serviceConcepts')
      .leftJoin('serviceConcepts.serviceConceptServiceTypes', 'serviceConceptServiceTypes')
      .leftJoin('serviceConceptServiceTypes.serviceType', 'serviceType')
      .leftJoin('serviceConcepts.images', 'images')
      .leftJoin('vendor.user_id', 'user_id')
      .leftJoin('user_id.role', 'role');

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
    const vendor = await this.vendorRepository
      .createQueryBuilder('vendor')
      .select([
        'vendor',
        'category.id',
        'category.name',
        'locations',
        'servicePackages',
        'serviceConcepts',
        'serviceConceptServiceTypes',
        'serviceType',
        'images'
      ])
      .leftJoin('vendor.category', 'category')
      .leftJoin('vendor.locations', 'locations')
      .leftJoin('vendor.servicePackages', 'servicePackages')
      .leftJoin('servicePackages.serviceConcepts', 'serviceConcepts')
      .leftJoin('serviceConcepts.serviceConceptServiceTypes', 'serviceConceptServiceTypes')
      .leftJoin('serviceConceptServiceTypes.serviceType', 'serviceType')
      .leftJoin('serviceConcepts.images', 'images')
      .where('vendor.slug = :slug', { slug })
      .getOne();

    if (!vendor) {
      throw new NotFoundException(`Nhà cung cấp với slug ${slug} không tồn tại`);
    }

    return vendor;
  }
  //#endregion findBySlug

  //#region getVendorByUserID with role 'ROO8'
  async getVendorByUserID(userID: string): Promise<Vendor> {
    const vendor = await this.vendorRepository
      .createQueryBuilder('vendor')
      .select([
        'vendor',
        'category.id',
        'category.name',
        'locations',
        'servicePackages',
        'serviceConcepts',
        'serviceConceptServiceTypes',
        'serviceType',
        'images',
        'user_id',
        'role'
      ])
      .leftJoin('vendor.category', 'category')
      .leftJoin('vendor.locations', 'locations')
      .leftJoin('vendor.servicePackages', 'servicePackages')
      .leftJoin('servicePackages.serviceConcepts', 'serviceConcepts')
      .leftJoin('serviceConcepts.serviceConceptServiceTypes', 'serviceConceptServiceTypes')
      .leftJoin('serviceConceptServiceTypes.serviceType', 'serviceType')
      .leftJoin('serviceConcepts.images', 'images')
      .leftJoin('vendor.user_id', 'user_id')
      .leftJoin('user_id.role', 'role')
      .where('user_id.id = :userID', { userID })
      .getOne();

    return vendor;
  }
  //#endregion getVendorByUserID with role 'ROO8'

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

        // Update location if provided
        if (updateVendorDto.location) {
          this.logger.log('Processing location with geocoding');

          // Remove existing locations
          await locationRepo.delete({
            vendor: { id: updatedVendor.id }
          });

          // Create new location with geocoding
          const processedLocation = await this.processUpdateLocationWithGeocoding(updateVendorDto.location);
          const location = locationRepo.create({
            address: processedLocation.address,
            district: processedLocation.district,
            ward: processedLocation.ward,
            city: processedLocation.city,
            province: processedLocation.province,
            latitude: processedLocation.latitude,
            longitude: processedLocation.longitude,
            vendor: updatedVendor
          });

          await locationRepo.save(location);
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
  async addManager(id: string, createVendorManagerDto: CreateVendorManagerDto): Promise<void> {
    const vendor = await this.vendorRepository.findOne({ where: { id } });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const user = await this.userRepository.findOne({ where: { id: createVendorManagerDto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingManager = await this.vendorManagerRepository.findOne({
      where: { vendor: { id }, user: { id: createVendorManagerDto.userId } },
    });

    if (existingManager) {
      throw new BadRequestException('User is already a manager of this vendor');
    }

    const vendorManager = this.vendorManagerRepository.create({
      vendor,
      user,
    });

    await this.vendorManagerRepository.save(vendorManager);
  }
  //#endregion VendorManager

  //#region VendorLike
  async likeVendor(id: string, createVendorLikeDto: CreateVendorLikeDto): Promise<void> {
    const vendor = await this.vendorRepository.findOne({ where: { id } });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const user = await this.userRepository.findOne({ where: { id: createVendorLikeDto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingLike = await this.vendorLikeRepository.findOne({
      where: { vendor: { id }, user: { id: createVendorLikeDto.userId } },
    });

    if (existingLike) {
      throw new BadRequestException('User has already liked this vendor');
    }

    const vendorLike = this.vendorLikeRepository.create({
      vendor,
      user,
    });

    await this.vendorLikeRepository.save(vendorLike);
  }
  //#endregion VendorLike

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

  private async processLocationWithGeocoding(locationDto: CreateLocationDto): Promise<CreateLocationDto> {
    // If coordinates are already provided, use them
    if (locationDto.latitude !== undefined && locationDto.longitude !== undefined) {
      this.logger.log(`Using provided coordinates: ${locationDto.latitude}, ${locationDto.longitude}`);
      return locationDto;
    }

    // If autoGeocode is disabled, return as is
    if (locationDto.autoGeocode === false) {
      this.logger.log('Auto geocoding is disabled for this location');
      return locationDto;
    }

    // Try to get coordinates from GoongAPI using complete address function
    try {
      this.logger.log(`Attempting to get complete address: ${locationDto.address}`);

      const completeAddressResult = await this.goongService.getCompleteAddressFromInput(
        locationDto.address,
        locationDto.district,
        locationDto.ward,
        locationDto.city,
        locationDto.province
      );

      if (completeAddressResult && completeAddressResult.latitude && completeAddressResult.longitude) {
        this.logger.log(`Successfully got coordinates: ${completeAddressResult.latitude}, ${completeAddressResult.longitude}`);
        return {
          ...locationDto,
          latitude: completeAddressResult.latitude,
          longitude: completeAddressResult.longitude,
        };
      } else {
        this.logger.warn(`Failed to get coordinates for address: ${locationDto.address}. Using provided coordinates or null.`);
        return locationDto;
      }
    } catch (error) {
      this.logger.error(`Error during complete address lookup: ${error.message}`);
      return locationDto;
    }
  }

  private async processUpdateLocationWithGeocoding(locationDto: any): Promise<any> {
    // If coordinates are already provided, use them
    if (locationDto.latitude !== undefined && locationDto.longitude !== undefined) {
      this.logger.log(`Using provided coordinates: ${locationDto.latitude}, ${locationDto.longitude}`);
      return locationDto;
    }

    // If autoGeocode is disabled, return as is
    if (locationDto.autoGeocode === false) {
      this.logger.log('Auto geocoding is disabled for this location');
      return locationDto;
    }

    // If no address provided, return as is
    if (!locationDto.address) {
      this.logger.log('No address provided for geocoding');
      return locationDto;
    }

    // Try to get coordinates from GoongAPI using complete address function
    try {
      this.logger.log(`Attempting to get complete address: ${locationDto.address}`);

      const completeAddressResult = await this.goongService.getCompleteAddressFromInput(
        locationDto.address,
        locationDto.district,
        locationDto.ward,
        locationDto.city,
        locationDto.province
      );

      if (completeAddressResult && completeAddressResult.latitude && completeAddressResult.longitude) {
        this.logger.log(`Successfully got coordinates: ${completeAddressResult.latitude}, ${completeAddressResult.longitude}`);
        return {
          ...locationDto,
          latitude: completeAddressResult.latitude,
          longitude: completeAddressResult.longitude,
        };
      } else {
        this.logger.warn(`Failed to get coordinates for address: ${locationDto.address}. Using provided coordinates or null.`);
        return locationDto;
      }
    } catch (error) {
      this.logger.error(`Error during complete address lookup: ${error.message}`);
      return locationDto;
    }
  }
  //#endregion Utility

  //#region getConceptImage
  async getConceptImage(
    vendorId: string,
    current: number = 1,
    pageSize: number = 10
  ): Promise<{
    data: any[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    // Calculate offset
    const skip = (current - 1) * pageSize;

    // Get total count
    const totalCountQuery = `
      SELECT COUNT(*) 
      FROM service_concept_image 
      WHERE service_concept_id IN (
        SELECT id FROM service_concept
        WHERE service_package_id IN (
          SELECT id FROM service_package
          WHERE vendor_id = $1
        )
      )
    `;

    // Get paginated data
    const dataQuery = `
      SELECT * FROM service_concept_image 
      WHERE service_concept_id IN (
        SELECT id FROM service_concept
        WHERE service_package_id IN (
          SELECT id FROM service_package
          WHERE vendor_id = $1
        )
      )
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    // Execute both queries
    const [totalCount, conceptImages] = await Promise.all([
      this.dataSource.query(totalCountQuery, [vendorId]),
      this.dataSource.query(dataQuery, [vendorId, pageSize, skip])
    ]);

    const totalItem = parseInt(totalCount[0].count);
    const totalPage = Math.ceil(totalItem / pageSize);

    return {
      data: conceptImages,
      pagination: {
        current,
        pageSize,
        totalPage,
        totalItem
      }
    };
  }
  //#endregion getConceptImage

  //#region SearchLocations with any FE term
  async searchLocation(query: string): Promise<Location[]> {
    const locations = await this.locationRepository.find({
      where: {
        city: ILike(`%${query}%`)
      }
    });
    return locations;
  }
  //#endregion SearchLocations with any FE term

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
    userLatitude?: number;
    userLongitude?: number;
    maxDistance?: number;
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
    const pageSize = params.pageSize ? Number(params.pageSize) : 3;
    const skip = (currentPage - 1) * pageSize;
    const sortDirection = params.sortDirection === 'asc' ? 'ASC' : 'DESC';
    let paramIndex = 1;
    const baseParams: any[] = [];

    // Function to calculate distance using Haversine formula
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Radius of the earth in km
      const dLat = this.deg2rad(lat2 - lat1);
      const dLon = this.deg2rad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distance in km
    };

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
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM subscription_vendor sv2 
              JOIN subscription_plan sp ON sp.id = sv2.plan_id 
              WHERE sv2.vendor_id = v.id 
              AND sv2.is_active = true
              AND sp.price = (
                SELECT MAX(price) FROM subscription_plan WHERE is_active = true
              )
            ) THEN true 
            ELSE false 
          END as priority
        FROM vendors v
      ),
      vendor_campaigns AS (
        SELECT 
          v.id,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM campaign_vendor cv
              JOIN campaign c ON c.id = cv.campaign_id
              JOIN user_campaign uc ON uc.campaign_id = c.id
              WHERE cv.vendor_id = v.id 
              AND cv.is_available = true
              AND c.status = true
              AND uc.isavailable = true
              GROUP BY cv.campaign_id
              HAVING COUNT(uc.user_id) >= 5
            ) THEN true 
            ELSE false 
          END as is_remarkable
        FROM vendors v
      ),
      filtered_vendors AS (
        SELECT DISTINCT v.id
        FROM vendors v
        LEFT JOIN locations l ON l.vendor_id = v.id
        LEFT JOIN category c ON c.id = v.category_id
        LEFT JOIN vendor_stats vs ON vs.id = v.id
        LEFT JOIN vendor_prices vp ON vp.id = v.id
        LEFT JOIN vendor_campaigns vc ON vc.id = v.id
        WHERE v.status = 'hoạt động'
        ${params.name ? `AND unaccent(v.name) ILIKE unaccent($${paramIndex})` : ''}
        ${params.location ? `AND EXISTS (
          SELECT 1 FROM locations l2 
          WHERE l2.vendor_id = v.id 
          AND unaccent(l2.city) ILIKE unaccent($${paramIndex + (params.name ? 1 : 0)})
        )` : ''}
        ${params.category ? `AND v.category_id = $${paramIndex + (params.name ? 1 : 0) + (params.location ? 1 : 0)}` : ''}
        ${params.minPrice !== undefined ? `AND vp.min_price >= $${paramIndex + (params.name ? 1 : 0) + (params.location ? 1 : 0) + (params.category ? 1 : 0)}` : ''}
        ${params.maxPrice !== undefined ? `AND vp.max_price <= $${paramIndex + (params.name ? 1 : 0) + (params.location ? 1 : 0) + (params.category ? 1 : 0) + (params.minPrice !== undefined ? 1 : 0)}` : ''}
        ${params.minRating !== undefined ? `AND vs.avg_rating >= $${paramIndex + (params.name ? 1 : 0) + (params.location ? 1 : 0) + (params.category ? 1 : 0) + (params.minPrice !== undefined ? 1 : 0) + (params.maxPrice !== undefined ? 1 : 0)}` : ''}
        ${params.maxRating !== undefined ? `AND vs.avg_rating <= $${paramIndex + (params.name ? 1 : 0) + (params.location ? 1 : 0) + (params.category ? 1 : 0) + (params.minPrice !== undefined ? 1 : 0) + (params.maxPrice !== undefined ? 1 : 0) + (params.minRating !== undefined ? 1 : 0)}` : ''}
        ${params.maxDistance !== undefined && params.userLatitude && params.userLongitude ? `
        AND EXISTS (
          SELECT 1 FROM locations l3
          WHERE l3.vendor_id = v.id
          AND (
            6371 * acos(
              cos(radians($${paramIndex + (params.name ? 1 : 0) + (params.location ? 1 : 0) + (params.category ? 1 : 0) + (params.minPrice !== undefined ? 1 : 0) + (params.maxPrice !== undefined ? 1 : 0) + (params.minRating !== undefined ? 1 : 0) + (params.maxRating !== undefined ? 1 : 0)})) * 
              cos(radians(l3.latitude)) * 
              cos(radians(l3.longitude) - radians($${paramIndex + (params.name ? 1 : 0) + (params.location ? 1 : 0) + (params.category ? 1 : 0) + (params.minPrice !== undefined ? 1 : 0) + (params.maxPrice !== undefined ? 1 : 0) + (params.minRating !== undefined ? 1 : 0) + (params.maxRating !== undefined ? 1 : 0) + 1})) + 
              sin(radians($${paramIndex + (params.name ? 1 : 0) + (params.location ? 1 : 0) + (params.category ? 1 : 0) + (params.minPrice !== undefined ? 1 : 0) + (params.maxPrice !== undefined ? 1 : 0) + (params.minRating !== undefined ? 1 : 0) + (params.maxRating !== undefined ? 1 : 0)})) * 
              sin(radians(l3.latitude))
            )
          ) <= $${paramIndex + (params.name ? 1 : 0) + (params.location ? 1 : 0) + (params.category ? 1 : 0) + (params.minPrice !== undefined ? 1 : 0) + (params.maxPrice !== undefined ? 1 : 0) + (params.minRating !== undefined ? 1 : 0) + (params.maxRating !== undefined ? 1 : 0) + 2}
        )` : ''}
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
        vsub.priority,
        vc.is_remarkable,
        c.id as category_id,
        c.name as category_name,
        l.id as location_id,
        l.address,
        l.district,
        l.ward,
        l.city,
        l.province,
        l.latitude,
        l.longitude,
        ${params.userLatitude && params.userLongitude ? `
        (
          6371 * acos(
            cos(radians($${paramIndex + (params.name ? 1 : 0) + (params.location ? 1 : 0) + (params.category ? 1 : 0)})) * 
            cos(radians(l.latitude)) * 
            cos(radians(l.longitude) - radians($${paramIndex + (params.name ? 1 : 0) + (params.location ? 1 : 0) + (params.category ? 1 : 0) + 1})) + 
            sin(radians($${paramIndex + (params.name ? 1 : 0) + (params.location ? 1 : 0) + (params.category ? 1 : 0)})) * 
            sin(radians(l.latitude))
          )
        ) as distance
        ` : 'NULL as distance'}
      FROM filtered_vendors fv
      JOIN vendors v ON v.id = fv.id
      LEFT JOIN locations l ON l.vendor_id = v.id
      LEFT JOIN vendor_stats vs ON vs.id = v.id
      LEFT JOIN vendor_prices vp ON vp.id = v.id
      LEFT JOIN vendor_subscriptions vsub ON vsub.id = v.id
      LEFT JOIN vendor_campaigns vc ON vc.id = v.id
      LEFT JOIN category c ON c.id = v.category_id
    `;


    // Add parameters in the correct order
    if (params.name) {
      baseParams.push(`%${params.name}%`);
      paramIndex++;
    }

    if (params.location) {
      baseParams.push(`%${params.location}%`);
      paramIndex++;
    }

    if (params.category) {
      baseParams.push(params.category);
      paramIndex++;
    }

    if (params.minPrice !== undefined) {
      baseParams.push(params.minPrice);
      paramIndex++;
    }

    if (params.maxPrice !== undefined) {
      baseParams.push(params.maxPrice);
      paramIndex++;
    }

    if (params.minRating !== undefined) {
      baseParams.push(params.minRating);
      paramIndex++;
    }

    if (params.maxRating !== undefined) {
      baseParams.push(params.maxRating);
      paramIndex++;
    }

    // Add user location parameters if provided
    if (params.userLatitude && params.userLongitude) {
      baseParams.push(params.userLatitude);
      baseParams.push(params.userLongitude);
      paramIndex += 2;
    }

    // Add maxDistance parameter if provided
    if (params.maxDistance !== undefined && params.userLatitude && params.userLongitude) {
      baseParams.push(params.maxDistance);
      paramIndex++;
    }

    // Add sorting
    switch (params.sortBy) {
      case VendorSortField.PRICE:
        baseQuery += ` ORDER BY vp.min_price ${sortDirection} NULLS LAST`;
        break;
      case VendorSortField.RATING:
        baseQuery += ` ORDER BY vs.avg_rating ${sortDirection} NULLS LAST`;
        break;
      case VendorSortField.NAME:
        baseQuery += ` ORDER BY v.name ${sortDirection}`;
        break;
      case VendorSortField.DISTANCE:
        if (params.userLatitude && params.userLongitude) {
          baseQuery += ` ORDER BY distance ${sortDirection} NULLS LAST`;
        } else {
          baseQuery += ` ORDER BY v.created_at DESC`;
        }
        break;
      default:
        baseQuery += ` ORDER BY v.created_at ${sortDirection}`;
    }

    // Add pagination
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

    // Add filters to count query
    if (params.name) {
      countQuery += ` AND unaccent(v.name) ILIKE unaccent($${countParamIndex})`;
      countParams.push(`%${params.name}%`);
      countParamIndex++;
    }

    if (params.location) {
      countQuery += ` AND EXISTS (
        SELECT 1 FROM locations l2 
        WHERE l2.vendor_id = v.id 
        AND unaccent(l2.city) ILIKE unaccent($${countParamIndex})
      )`;
      countParams.push(`%${params.location}%`);
      countParamIndex++;
    }

    if (params.category) {
      countQuery += ` AND v.category_id = $${countParamIndex}`;
      countParams.push(params.category);
      countParamIndex++;
    }

    // Add distance calculation to count query if location is provided
    if (params.userLatitude && params.userLongitude) {
      countQuery += ` AND EXISTS (
        SELECT 1 FROM locations l3
        WHERE l3.vendor_id = v.id
        AND (
          6371 * acos(
            cos(radians($${countParamIndex})) * 
            cos(radians(l3.latitude)) * 
            cos(radians(l3.longitude) - radians($${countParamIndex + 1})) + 
            sin(radians($${countParamIndex})) * 
            sin(radians(l3.latitude))
          )
        ) <= $${countParamIndex + 2}
      )`;
      countParams.push(params.userLatitude, params.userLongitude, params.maxDistance || 999999);
      countParamIndex += 3;
    }

    // Add price filters to count query
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

    // Add rating filters to count query
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

    // Convert origin prices to final prices for service concepts
    const servicePackagesWithFinalPrices = await Promise.all(
      servicePackages.map(async (row: any) => {
        if (row.service_concept_id) {
          try {
            const conceptWithFinalPrice = await this.servicePackageService.findServiceConcept(row.service_concept_id);
            return {
              ...row,
              service_concept_price: conceptWithFinalPrice.price // Final price that customer sees
            };
          } catch (error) {
            this.logger.warn(`Could not get final price for concept ${row.service_concept_id}: ${error.message}`);
            return row; // Keep original price as fallback
          }
        }
        return row;
      })
    );

    // Group service packages and reviews by vendor
    const servicePackagesByVendor = new Map();
    const reviewsByVendor = new Map();

    servicePackagesWithFinalPrices.forEach((row: any) => {
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
    const vendorMap = new Map();

    vendorData.forEach((row: any) => {
      if (!vendorMap.has(row.id)) {
        vendorMap.set(row.id, {
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
          minPrice: Math.round(row.min_price ? this.convertOriginPriceToFinalPrice(Number(parseFloat(row.min_price).toFixed(2))) : null),
          maxPrice: Math.round(row.max_price ? this.convertOriginPriceToFinalPrice(Number(parseFloat(row.max_price).toFixed(2))) : null),
          isRemarkable: row.is_remarkable === true,
          priority: row.priority === true,
          distance: row.distance ? Number(parseFloat(row.distance).toFixed(2)) : null,
          locations: [],
          servicePackages: Array.from(servicePackagesByVendor.get(row.id)?.values() || []),
          category: row.category_id ? {
            id: row.category_id,
            name: row.category_name
          } : null,
          reviews: reviewsByVendor.get(row.id) || []
        });
      }
      // Push location if exists
      if (row.location_id) {
        vendorMap.get(row.id).locations.push({
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

    const vendors = Array.from(vendorMap.values());

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

  //#region filterVendorsAdmin
  async filterVendorsAdmin(params: {
    name?: string;
    contact?: string;
    status?: string;
    minBranches?: number;
    maxBranches?: number;
    minPackages?: number;
    maxPackages?: number;
    minOrders?: number;
    maxOrders?: number;
    minRating?: number;
    maxRating?: number;
    minPriority?: number;
    maxPriority?: number;
    joinDateFrom?: string;
    joinDateTo?: string;
    category?: string;
    hasLogo?: boolean;
    current?: string;
    pageSize?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<{
    data: any[];
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
    let paramIndex = 1;
    const baseParams: any[] = [];

    // Base query for admin vendor filtering
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
      vendor_packages AS (
        SELECT 
          v.id,
          COUNT(sp.id) as package_count
        FROM vendors v
        LEFT JOIN service_package sp ON sp.vendor_id = v.id
        GROUP BY v.id
      ),
      vendor_branches AS (
        SELECT 
          v.id,
          COUNT(l.id) as branch_count
        FROM vendors v
        LEFT JOIN locations l ON l.vendor_id = v.id
        GROUP BY v.id
      ),
      vendor_orders AS (
        SELECT 
          v.id,
          COUNT(b.id) as order_count
        FROM vendors v
        LEFT JOIN locations l ON l.vendor_id = v.id
        LEFT JOIN booking b ON b.location_id = l.id
        GROUP BY v.id
      ),
      vendor_subscriptions_admin AS (
        SELECT 
          v.id,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM subscription_vendor sv2 
              JOIN subscription_plan sp ON sp.id = sv2.plan_id 
              WHERE sv2.vendor_id = v.id 
              AND sv2.is_active = true
              AND sp.price = (
                SELECT MAX(price) FROM subscription_plan WHERE is_active = true
              )
            ) THEN true 
            ELSE false 
          END as priority
        FROM vendors v
      ),
      vendor_campaigns_admin AS (
        SELECT 
          v.id,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM campaign_vendor cv
              JOIN campaign c ON c.id = cv.campaign_id
              JOIN user_campaign uc ON uc.campaign_id = c.id
              WHERE cv.vendor_id = v.id 
              AND cv.is_available = true
              AND c.status = true
              AND uc.isavailable = true
              GROUP BY cv.campaign_id
              HAVING COUNT(uc.user_id) >= 5
            ) THEN true 
            ELSE false 
          END as is_remarkable
        FROM vendors v
      ),
      filtered_vendors AS (
        SELECT DISTINCT v.id
        FROM vendors v
        LEFT JOIN category c ON c.id = v.category_id
        LEFT JOIN vendor_stats vs ON vs.id = v.id
        LEFT JOIN vendor_packages vp ON vp.id = v.id
        LEFT JOIN vendor_branches vb ON vb.id = v.id
        LEFT JOIN vendor_orders vo ON vo.id = v.id
        LEFT JOIN vendor_subscriptions_admin vsa ON vsa.id = v.id
        LEFT JOIN vendor_campaigns_admin vca ON vca.id = v.id
        LEFT JOIN users u ON u.id = v.user_id
        WHERE 1=1
        ${params.name ? `AND unaccent(v.name) ILIKE unaccent($${paramIndex})` : ''}
        ${params.contact ? `AND (unaccent(u.phone_number) ILIKE unaccent($${paramIndex + (params.name ? 1 : 0)}) OR unaccent(u.email) ILIKE unaccent($${paramIndex + (params.name ? 1 : 0)}))` : ''}
        ${params.status ? `AND v.status = $${paramIndex + (params.name ? 1 : 0) + (params.contact ? 1 : 0)}` : ''}
        ${params.category ? `AND v.category_id = $${paramIndex + (params.name ? 1 : 0) + (params.contact ? 1 : 0) + (params.status ? 1 : 0)}` : ''}
        ${params.hasLogo !== undefined ? `AND v.logo IS ${params.hasLogo ? 'NOT NULL' : 'NULL'}` : ''}
        ${params.minBranches !== undefined ? `AND vb.branch_count >= $${paramIndex + (params.name ? 1 : 0) + (params.contact ? 1 : 0) + (params.status ? 1 : 0) + (params.category ? 1 : 0)}` : ''}
        ${params.maxBranches !== undefined ? `AND vb.branch_count <= $${paramIndex + (params.name ? 1 : 0) + (params.contact ? 1 : 0) + (params.status ? 1 : 0) + (params.category ? 1 : 0) + (params.minBranches !== undefined ? 1 : 0)}` : ''}
        ${params.minPackages !== undefined ? `AND vp.package_count >= $${paramIndex + (params.name ? 1 : 0) + (params.contact ? 1 : 0) + (params.status ? 1 : 0) + (params.category ? 1 : 0) + (params.minBranches !== undefined ? 1 : 0) + (params.maxBranches !== undefined ? 1 : 0)}` : ''}
        ${params.maxPackages !== undefined ? `AND vp.package_count <= $${paramIndex + (params.name ? 1 : 0) + (params.contact ? 1 : 0) + (params.status ? 1 : 0) + (params.category ? 1 : 0) + (params.minBranches !== undefined ? 1 : 0) + (params.maxBranches !== undefined ? 1 : 0) + (params.minPackages !== undefined ? 1 : 0)}` : ''}
        ${params.minOrders !== undefined ? `AND vo.order_count >= $${paramIndex + (params.name ? 1 : 0) + (params.contact ? 1 : 0) + (params.status ? 1 : 0) + (params.category ? 1 : 0) + (params.minBranches !== undefined ? 1 : 0) + (params.maxBranches !== undefined ? 1 : 0) + (params.minPackages !== undefined ? 1 : 0) + (params.maxPackages !== undefined ? 1 : 0)}` : ''}
        ${params.maxOrders !== undefined ? `AND vo.order_count <= $${paramIndex + (params.name ? 1 : 0) + (params.contact ? 1 : 0) + (params.status ? 1 : 0) + (params.category ? 1 : 0) + (params.minBranches !== undefined ? 1 : 0) + (params.maxBranches !== undefined ? 1 : 0) + (params.minPackages !== undefined ? 1 : 0) + (params.maxPackages !== undefined ? 1 : 0) + (params.minOrders !== undefined ? 1 : 0)}` : ''}
        ${params.minRating !== undefined ? `AND vs.avg_rating >= $${paramIndex + (params.name ? 1 : 0) + (params.contact ? 1 : 0) + (params.status ? 1 : 0) + (params.category ? 1 : 0) + (params.minBranches !== undefined ? 1 : 0) + (params.maxBranches !== undefined ? 1 : 0) + (params.minPackages !== undefined ? 1 : 0) + (params.maxPackages !== undefined ? 1 : 0) + (params.minOrders !== undefined ? 1 : 0) + (params.maxOrders !== undefined ? 1 : 0)}` : ''}
        ${params.maxRating !== undefined ? `AND vs.avg_rating <= $${paramIndex + (params.name ? 1 : 0) + (params.contact ? 1 : 0) + (params.status ? 1 : 0) + (params.category ? 1 : 0) + (params.minBranches !== undefined ? 1 : 0) + (params.maxBranches !== undefined ? 1 : 0) + (params.minPackages !== undefined ? 1 : 0) + (params.maxPackages !== undefined ? 1 : 0) + (params.minOrders !== undefined ? 1 : 0) + (params.maxOrders !== undefined ? 1 : 0) + (params.minRating !== undefined ? 1 : 0)}` : ''}
        ${params.minPriority !== undefined ? `AND vsa.priority = true` : ''}
        ${params.maxPriority !== undefined ? `AND vsa.priority = true` : ''}
        ${params.joinDateFrom ? `AND DATE(v.created_at) >= $${paramIndex + (params.name ? 1 : 0) + (params.contact ? 1 : 0) + (params.status ? 1 : 0) + (params.category ? 1 : 0) + (params.minBranches !== undefined ? 1 : 0) + (params.maxBranches !== undefined ? 1 : 0) + (params.minPackages !== undefined ? 1 : 0) + (params.maxPackages !== undefined ? 1 : 0) + (params.minOrders !== undefined ? 1 : 0) + (params.maxOrders !== undefined ? 1 : 0) + (params.minRating !== undefined ? 1 : 0) + (params.maxRating !== undefined ? 1 : 0) + (params.minPriority !== undefined ? 1 : 0) + (params.maxPriority !== undefined ? 1 : 0)}` : ''}
        ${params.joinDateTo ? `AND DATE(v.created_at) <= $${paramIndex + (params.name ? 1 : 0) + (params.contact ? 1 : 0) + (params.status ? 1 : 0) + (params.category ? 1 : 0) + (params.minBranches !== undefined ? 1 : 0) + (params.maxBranches !== undefined ? 1 : 0) + (params.minPackages !== undefined ? 1 : 0) + (params.maxPackages !== undefined ? 1 : 0) + (params.minOrders !== undefined ? 1 : 0) + (params.maxOrders !== undefined ? 1 : 0) + (params.minRating !== undefined ? 1 : 0) + (params.maxRating !== undefined ? 1 : 0) + (params.minPriority !== undefined ? 1 : 0) + (params.maxPriority !== undefined ? 1 : 0) + (params.joinDateFrom ? 1 : 0)}` : ''}
      )
      SELECT 
        v.id,
        v.name,
        v.description,
        v.logo,
        v.banner,
        v.status,
        v.slug,
        v.created_at,
        v.updated_at,
        vsa.priority,
        vca.is_remarkable,
        vs.avg_rating,
        vs.review_count,
        vp.package_count,
        vb.branch_count,
        vo.order_count,
        c.id as category_id,
        c.name as category_name,
        u.id as user_id,
        u.phone_number as contact_phone,
        u.email as contact_email
      FROM filtered_vendors fv
      JOIN vendors v ON v.id = fv.id
      LEFT JOIN locations l ON l.vendor_id = v.id
      LEFT JOIN vendor_stats vs ON vs.id = v.id
      LEFT JOIN vendor_packages vp ON vp.id = v.id
      LEFT JOIN vendor_branches vb ON vb.id = v.id
      LEFT JOIN vendor_orders vo ON vo.id = v.id
      LEFT JOIN vendor_subscriptions_admin vsa ON vsa.id = v.id
      LEFT JOIN vendor_campaigns_admin vca ON vca.id = v.id
      LEFT JOIN category c ON c.id = v.category_id
      LEFT JOIN users u ON u.id = v.user_id
    `;

    // Add parameters in the correct order
    if (params.name) {
      baseParams.push(`%${params.name}%`);
      paramIndex++;
    }

    if (params.contact) {
      baseParams.push(`%${params.contact}%`);
      paramIndex++;
    }

    if (params.status) {
      baseParams.push(params.status);
      paramIndex++;
    }

    if (params.category) {
      baseParams.push(params.category);
      paramIndex++;
    }

    if (params.minBranches !== undefined) {
      baseParams.push(params.minBranches);
      paramIndex++;
    }

    if (params.maxBranches !== undefined) {
      baseParams.push(params.maxBranches);
      paramIndex++;
    }

    if (params.minPackages !== undefined) {
      baseParams.push(params.minPackages);
      paramIndex++;
    }

    if (params.maxPackages !== undefined) {
      baseParams.push(params.maxPackages);
      paramIndex++;
    }

    if (params.minOrders !== undefined) {
      baseParams.push(params.minOrders);
      paramIndex++;
    }

    if (params.maxOrders !== undefined) {
      baseParams.push(params.maxOrders);
      paramIndex++;
    }

    if (params.minRating !== undefined) {
      baseParams.push(params.minRating);
      paramIndex++;
    }

    if (params.maxRating !== undefined) {
      baseParams.push(params.maxRating);
      paramIndex++;
    }

    if (params.minPriority !== undefined) {
      baseParams.push(params.minPriority);
      paramIndex++;
    }

    if (params.maxPriority !== undefined) {
      baseParams.push(params.maxPriority);
      paramIndex++;
    }

    if (params.joinDateFrom) {
      baseParams.push(params.joinDateFrom);
      paramIndex++;
    }

    if (params.joinDateTo) {
      baseParams.push(params.joinDateTo);
      paramIndex++;
    }

    // Add sorting
    let sortField = 'v.created_at'; // default sort field

    // Map DTO sortBy values to SQL field names
    switch (params.sortBy) {
      case 'createdAt':
        sortField = 'v.created_at';
        break;
      case 'updatedAt':
        sortField = 'v.updated_at';
        break;
      case 'name':
        sortField = 'v.name';
        break;
      case 'category':
        sortField = 'c.name';
        break;
      case 'priority':
        sortField = 'v.priority';
        break;
      case 'order_count':
        sortField = 'vo.order_count';
        break;
      case 'package_count':
        sortField = 'vp.package_count';
        break;
      case 'branch_count':
        sortField = 'vb.branch_count';
        break;
      default:
        sortField = 'v.created_at';
    }

    baseQuery += ` ORDER BY ${sortField} ${sortDirection} NULLS LAST`;

    // Add pagination
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
      vendor_packages AS (
        SELECT 
          v.id,
          COUNT(sp.id) as package_count
        FROM vendors v
        LEFT JOIN service_package sp ON sp.vendor_id = v.id
        GROUP BY v.id
      ),
      vendor_branches AS (
        SELECT 
          v.id,
          COUNT(l.id) as branch_count
        FROM vendors v
        LEFT JOIN locations l ON l.vendor_id = v.id
        GROUP BY v.id
      ),
      vendor_orders AS (
        SELECT 
          v.id,
          COUNT(b.id) as order_count
        FROM vendors v
        LEFT JOIN locations l ON l.vendor_id = v.id
        LEFT JOIN booking b ON b.location_id = l.id
        GROUP BY v.id
      )
      SELECT COUNT(DISTINCT v.id)
      FROM vendors v
      LEFT JOIN category c ON c.id = v.category_id
      LEFT JOIN vendor_stats vs ON vs.id = v.id
      LEFT JOIN vendor_packages vp ON vp.id = v.id
      LEFT JOIN vendor_branches vb ON vb.id = v.id
      LEFT JOIN vendor_orders vo ON vo.id = v.id
      LEFT JOIN users u ON u.id = v.user_id
      WHERE 1=1
    `;

    const countParams: any[] = [];
    let countParamIndex = 1;

    // Add filters to count query
    if (params.name) {
      countQuery += ` AND unaccent(v.name) ILIKE unaccent($${countParamIndex})`;
      countParams.push(`%${params.name}%`);
      countParamIndex++;
    }

    if (params.contact) {
      countQuery += ` AND (unaccent(u.phone_number) ILIKE unaccent($${countParamIndex}) OR unaccent(u.email) ILIKE unaccent($${countParamIndex}))`;
      countParams.push(`%${params.contact}%`);
      countParamIndex++;
    }

    if (params.status) {
      countQuery += ` AND v.status = $${countParamIndex}`;
      countParams.push(params.status);
      countParamIndex++;
    }

    if (params.category) {
      countQuery += ` AND v.category_id = $${countParamIndex}`;
      countParams.push(params.category);
      countParamIndex++;
    }

    if (params.hasLogo !== undefined) {
      countQuery += ` AND v.logo IS ${params.hasLogo ? 'NOT NULL' : 'NULL'}`;
    }

    if (params.minBranches !== undefined) {
      countQuery += ` AND vb.branch_count >= $${countParamIndex}`;
      countParams.push(params.minBranches);
      countParamIndex++;
    }

    if (params.maxBranches !== undefined) {
      countQuery += ` AND vb.branch_count <= $${countParamIndex}`;
      countParams.push(params.maxBranches);
      countParamIndex++;
    }

    if (params.minPackages !== undefined) {
      countQuery += ` AND vp.package_count >= $${countParamIndex}`;
      countParams.push(params.minPackages);
      countParamIndex++;
    }

    if (params.maxPackages !== undefined) {
      countQuery += ` AND vp.package_count <= $${countParamIndex}`;
      countParams.push(params.maxPackages);
      countParamIndex++;
    }

    if (params.minOrders !== undefined) {
      countQuery += ` AND vo.order_count >= $${countParamIndex}`;
      countParams.push(params.minOrders);
      countParamIndex++;
    }

    if (params.maxOrders !== undefined) {
      countQuery += ` AND vo.order_count <= $${countParamIndex}`;
      countParams.push(params.maxOrders);
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

    if (params.minPriority !== undefined) {
      countQuery += ` AND EXISTS (
        SELECT 1 FROM subscription_vendor sv2 
        JOIN subscription_plan sp ON sp.id = sv2.plan_id 
        WHERE sv2.vendor_id = v.id 
        AND sv2.is_active = true
        AND sp.price = (
          SELECT MAX(price) FROM subscription_plan WHERE is_active = true
        )
      )`;
    }

    if (params.maxPriority !== undefined) {
      countQuery += ` AND EXISTS (
        SELECT 1 FROM subscription_vendor sv2 
        JOIN subscription_plan sp ON sp.id = sv2.plan_id 
        WHERE sv2.vendor_id = v.id 
        AND sv2.is_active = true
        AND sp.price = (
          SELECT MAX(price) FROM subscription_plan WHERE is_active = true
        )
      )`;
    }

    if (params.joinDateFrom) {
      countQuery += ` AND DATE(v.created_at) >= $${countParamIndex}`;
      countParams.push(params.joinDateFrom);
      countParamIndex++;
    }

    if (params.joinDateTo) {
      countQuery += ` AND DATE(v.created_at) <= $${countParamIndex}`;
      countParams.push(params.joinDateTo);
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

    // Map vendors for admin response
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
      priority: row.priority === true,
      isRemarkable: row.is_remarkable === true,
      averageRating: Number(parseFloat(row.avg_rating || 0).toFixed(1)),
      reviewCount: parseInt(row.review_count) || 0,
      packageCount: parseInt(row.package_count) || 0,
      branchCount: parseInt(row.branch_count) || 0,
      orderCount: parseInt(row.order_count) || 0,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name
      } : null,
      contact: {
        phone: row.contact_phone || '',
        email: row.contact_email || ''
      }
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
  //#endregion filterVendorsAdmin

  // Helper function to convert degrees to radians
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Helper function to convert origin price to final price (for customer display)
  private convertOriginPriceToFinalPrice(originPrice: number): number {
    // Final price = Origin price * (1 + commission + tax)
    // Commission = 30%, Tax = 5%
    return originPrice * 1.35;
  }
}