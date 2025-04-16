import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { Category } from '../categories/entities/category.entity';
import { VendorStatus } from 'src/constants/vendor.enum';
import { Location } from '../locations/entities/location.entity';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { FindVendorDto } from './dto/find-vendor.dto';
import { slugify } from 'src/utils/utils';


@Injectable()
export class VendorService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly dataSource: DataSource,
  ) { }

  //#region create
  async create(createVendorDto: CreateVendorDto): Promise<Vendor> {
    return this.dataSource.transaction(async (manager) => {
      const categoryRepo = manager.getRepository(Category);
      const vendorRepo = manager.getRepository(Vendor);
      const locationRepo = manager.getRepository(Location);

      const category = await categoryRepo.findOne({
        where: { id: createVendorDto.category_id },
      });
      if (!category) {
        throw new NotFoundException(`Không tìm thấy danh mục với ID ${createVendorDto.category_id}`);
      }

      // Sử dụng hàm generateUniqueSlug của chính class này
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
  //#endregion create

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
  //#endregion findAll

  //#region findOne
  async findOne(id: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { id },
      relations: ['category', 'locations'],
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor với ID ${id} không tồn tại`);
    }
    return vendor;
  }
  //#endregion findOne

  //#region until generateUniqueSlug
  private async generateUniqueSlug(
    vendorRepo: Repository<Vendor>,
    name: string,
  ): Promise<string> {
    const baseSlug = slugify(name);

    // Lấy tất cả các slug có dạng bắt đầu bằng baseSlug
    const existingVendors = await vendorRepo.find({
      select: ['slug'],
      where: { slug: Like(`${baseSlug}%`) },
    });
    const existingSlugs = existingVendors.map(vendor => vendor.slug);

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
  //#endregion until generateUniqueSlug


}