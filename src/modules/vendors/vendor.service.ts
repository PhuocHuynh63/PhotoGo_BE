import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { Category } from '../categories/entities/category.entity';
import { VendorStatus } from 'src/constants/vendor.enum';
import { Location } from '../locations/entities/location.entity';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { FindVendorDto } from './dto/find-vendor.dto';

@Injectable()
export class VendorService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly dataSource: DataSource,
  ) {}

  //#region create
  async create(createVendorDto: CreateVendorDto): Promise<Vendor> {
    return await this.dataSource.transaction(async (manager) => {
      // Check if the category exists
      const category = await manager.getRepository(Category).findOne({
        where: { id: createVendorDto.category_id },
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${createVendorDto.category_id} not found`);
      }

      // Check if the slug is already in use
      const existingVendor = await manager.getRepository(Vendor).findOne({
        where: { slug: createVendorDto.slug },
      });
      if (existingVendor) {
        throw new BadRequestException(`Slug ${createVendorDto.slug} is already in use`);
      }

      // Create the vendor
      const vendor = manager.getRepository(Vendor).create({
        name: createVendorDto.name,
        slug: createVendorDto.slug,
        category,
        description: createVendorDto.description,
        status: createVendorDto.status || VendorStatus.ACTIVE,
      });

      const savedVendor = await manager.getRepository(Vendor).save(vendor);

      // Create locations and associate them with the vendor
      if (createVendorDto.locations && createVendorDto.locations.length > 0) {
        const locations = createVendorDto.locations.map((locationDto) =>
          manager.getRepository(Location).create({
            address: locationDto.address,
            city: locationDto.city,
            province: locationDto.province,
            latitude: locationDto.latitude,
            longitude: locationDto.longitude,
            vendor: savedVendor,
          }),
        );
        await manager.getRepository(Location).save(locations);
      }

      // Reload the vendor with its relations
      return manager.getRepository(Vendor).findOne({
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
}