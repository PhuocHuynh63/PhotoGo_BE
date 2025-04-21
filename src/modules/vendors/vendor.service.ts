import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { Category } from '../categories/entities/category.entity';
import { VendorStatus } from 'src/constants/vendor.enum';
import { Location } from '../locations/entities/location.entity';
import { CreateLocationDto } from '../locations/dto/create-location.dto';
import { VendorManager } from './entities/vendor-manager.entity';
import { VendorLike } from './entities/vendor-like.entity';
import { VendorAvailability } from './entities/vendor-availability.entity';
import { CreateVendorDto, CreateVendorManagerDto, CreateVendorLikeDto, CreateVendorAvailabilityDto } from './dto/create-vendor.dto';
import { FindVendorDto } from './dto/find-vendor.dto';
import { slugify } from 'src/utils/utils';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { UploadService } from 'src/3rdService/upload/upload.service'; // Assuming you have an UploadService for handling file uploads

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
    private readonly dataSource: DataSource,
    private readonly uploadService: UploadService,
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
        this.logger.error(`Failed to upload logo: ${error.message}`);
        throw new BadRequestException(`Failed to upload logo: ${error.message}`);
      }
    }

    // Upload banner
    if (files.banner) {
      this.logger.log('Uploading banner');
      try {
        const uploadResult = await this.uploadService.uploadImage(files.banner, 'vendors/banners');
        vendorData.banner = uploadResult;
      } catch (error) {
        this.logger.error(`Failed to upload banner: ${error.message}`);
        throw new BadRequestException(`Failed to upload banner: ${error.message}`);
      }
    }

    // Upload image_url
    if (files.image_url) {
      this.logger.log('Uploading image_url');
      try {
        const uploadResult = await this.uploadService.uploadImage(files.image_url, 'vendors/images');
        vendorData.image_url = uploadResult;
      } catch (error) {
        this.logger.error(`Failed to upload image_url: ${error.message}`);
        throw new BadRequestException(`Failed to upload image_url: ${error.message}`);
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
          throw new NotFoundException(`Category with ID ${createVendorDto.category_id} not found`);
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
              throw new BadRequestException(`Address is required for location at index ${index}`);
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
          this.logger.warn('No valid locations provided');
        }

        this.logger.log('Fetching saved vendor with relations');
        const result = await vendorRepo.findOne({
          where: { id: savedVendor.id },
          relations: ['category', 'locations'],
        });

        this.logger.log(`Create vendor completed in ${Date.now() - startTime}ms`);
        return result;
      } catch (error) {
        this.logger.error(`Transaction failed: ${error.message}`);
        throw error;
      }
    });
  }
  //#endregion CreateVendor

  //#region findOne
  async findOne(id: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { id },
      relations: ['category', 'locations'],
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }
    return vendor;
  }
  //#endregion findOne

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

  //#region update
  async update(id: string, updateVendorDto: UpdateVendorDto): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({ where: { id } });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    const uniqueSlug = await this.generateUniqueSlug(this.vendorRepository, updateVendorDto.name);

    Object.assign(vendor, {
      ...updateVendorDto,
      slug: uniqueSlug,
    });

    return this.vendorRepository.save(vendor);
  }
  //#endregion update

  //#region remove
  async remove(id: string): Promise<void> {
    const vendor = await this.vendorRepository.findOne({ where: { id } });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
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
}