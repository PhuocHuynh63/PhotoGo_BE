import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class VendorService {
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
  ) {}

  //#region Vendor
  async create(createVendorDto: CreateVendorDto): Promise<Vendor> {
    return this.dataSource.transaction(async (manager) => {
      const categoryRepo = manager.getRepository(Category);
      const vendorRepo = manager.getRepository(Vendor);
      const locationRepo = manager.getRepository(Location);

      const category = await categoryRepo.findOne({
        where: { id: createVendorDto.category_id },
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${createVendorDto.category_id} not found`);
      }

      const uniqueSlug = await this.generateUniqueSlug(vendorRepo, createVendorDto.name);

      const vendor = vendorRepo.create({
        name: createVendorDto.name,
        slug: uniqueSlug,
        category,
        description: createVendorDto.description,
        status: createVendorDto.status || VendorStatus.ACTIVE,
      });

      const savedVendor = await vendorRepo.save(vendor);

      if (createVendorDto.locations?.length) {
        const locations = createVendorDto.locations.map((locationDto) =>
          locationRepo.create({
            ...locationDto,
            vendor: savedVendor,
          }),
        );
        await locationRepo.save(locations);
      }

      return vendorRepo.findOne({
        where: { id: savedVendor.id },
        relations: ['category', 'locations'],
      });
    });
  }

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
        '(vendor.name ILIKE :term OR vendor.slug ILIKE :term)',
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
  //#endregion Vendor

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