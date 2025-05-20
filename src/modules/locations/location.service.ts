import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { FindLocationDto } from './dto/find-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Vendor } from '../vendors/entities/vendor.entity';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
  ) { }

  //#region create
  async create(createLocationDto: CreateLocationDto): Promise<Location> {
    // Check if vendor exists
    const vendor = await this.vendorRepository.findOne({
      where: { id: createLocationDto.vendor_id }
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor with id ${createLocationDto.vendor_id} not found`);
    }

    // Validate coordinates if provided
    if (createLocationDto.latitude !== undefined || createLocationDto.longitude !== undefined) {
      if (createLocationDto.latitude === undefined || createLocationDto.longitude === undefined) {
        throw new BadRequestException('Both latitude and longitude must be provided together');
      }
      if (createLocationDto.latitude < -90 || createLocationDto.latitude > 90) {
        throw new BadRequestException('Latitude must be between -90 and 90 degrees');
      }
      if (createLocationDto.longitude < -180 || createLocationDto.longitude > 180) {
        throw new BadRequestException('Longitude must be between -180 and 180 degrees');
      }
    }

    const location = this.locationRepository.create({
      ...createLocationDto,
      vendor,
    });

    return this.locationRepository.save(location);
  }
  //#endregion create

  //#region findAll
  async findAll(query: FindLocationDto): Promise<{
    data: Location[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    //#region Pagination
    const currentPage = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;
    //#endregion

    //#region Filter
    const queryBuilder = this.locationRepository.createQueryBuilder('location');

    queryBuilder.leftJoinAndSelect('location.vendor', 'vendor');

    if (query.term) {
      queryBuilder.andWhere(
        `(unaccent(location.address) ILIKE unaccent(:term) OR unaccent(location.city) ILIKE unaccent(:term) OR unaccent(location.province) ILIKE unaccent(:term))`,
        { term: `%${query.term}%` },
      );
    }
    //#endregion

    //#region Sort
    const allowedSortFields = ['created_at', 'updated_at', 'address', 'city', 'province'];
    const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'created_at';
    const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';

    queryBuilder.orderBy(`location.${sortField}`, sortDirection);
    //#endregion

    //#region Pagination
    queryBuilder.skip(skip).take(pageSize);
    //#endregion

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
  async findOne(id: string): Promise<Location> {
    const location = await this.locationRepository.findOne({
      where: { id },
      relations: ['vendor'],
    });
    if (!location) {
      throw new NotFoundException(`Địa điểm với id ${id} không tồn tại`);
    }
    return location;
  }
  //#endregion findOne

  //#region updateLocation
  async updateLocation(id: string, updateLocationDto: UpdateLocationDto): Promise<Location> {
    const location = await this.findOne(id);
    Object.assign(location, updateLocationDto);
    return this.locationRepository.save(location);
  }
  //#endregion updateLocation

  //#region deleteLocation
  async deleteLocation(id: string): Promise<void> {
    const location = await this.findOne(id);
    await this.locationRepository.remove(location);
  }
  //#endregion deleteLocation
}