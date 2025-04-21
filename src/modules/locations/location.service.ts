import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { FindLocationDto } from './dto/find-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) { }

  //#region create
  async create(createLocationDto: CreateLocationDto): Promise<Location> {
    const location = this.locationRepository.create(createLocationDto);
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