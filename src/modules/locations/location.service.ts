import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Location } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { FindLocationDto } from './dto/find-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Vendor } from '../vendors/entities/vendor.entity';
import { Not } from 'typeorm';
import { SearchLocationDto } from './dto/search-location.dto';

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
    // Validate required fields
    if (!createLocationDto.vendor_id) {
      throw new BadRequestException('ID vendor không được để trống');
    }
    if (!createLocationDto.address) {
      throw new BadRequestException('Địa chỉ không được để trống');
    }
    if (!createLocationDto.city) {
      throw new BadRequestException('Thành phố không được để trống');
    }
    if (!createLocationDto.province) {
      throw new BadRequestException('Tỉnh/Thành phố không được để trống');
    }

    // Check if vendor exists
    const vendor = await this.vendorRepository.findOne({
      where: { id: createLocationDto.vendor_id }
    });
    if (!vendor) {
      throw new NotFoundException(`Không tìm thấy vendor với ID ${createLocationDto.vendor_id}`);
    }

    // Check if vendor already has a location with the same address
    const existingLocation = await this.locationRepository.findOne({
      where: {
        vendor: { id: createLocationDto.vendor_id },
        address: createLocationDto.address,
        city: createLocationDto.city,
        province: createLocationDto.province
      }
    });
    if (existingLocation) {
      throw new ConflictException('Vendor đã có địa điểm này');
    }

    // Validate coordinates if provided
    if (createLocationDto.latitude !== undefined || createLocationDto.longitude !== undefined) {
      if (createLocationDto.latitude === undefined || createLocationDto.longitude === undefined) {
        throw new BadRequestException('Cả latitude và longitude phải được cung cấp cùng nhau');
      }
      if (createLocationDto.latitude < -90 || createLocationDto.latitude > 90) {
        throw new BadRequestException('Latitude phải nằm trong khoảng từ -90 đến 90 độ');
      }
      if (createLocationDto.longitude < -180 || createLocationDto.longitude > 180) {
        throw new BadRequestException('Longitude phải nằm trong khoảng từ -180 đến 180 độ');
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
    // Validate pagination parameters
    const currentPage = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;

    if (currentPage < 1) {
      throw new BadRequestException('Trang hiện tại phải lớn hơn 0');
    }
    if (pageSize < 1 || pageSize > 100) {
      throw new BadRequestException('Số lượng item trên trang phải từ 1 đến 100');
    }

    const skip = (currentPage - 1) * pageSize;

    // Build query
    const queryBuilder = this.locationRepository.createQueryBuilder('location')
      .leftJoinAndSelect('location.vendor', 'vendor');

    // Apply filters
    if (query.term) {
      queryBuilder.andWhere(
        `(unaccent(location.address) ILIKE unaccent(:term) OR unaccent(location.city) ILIKE unaccent(:term) OR unaccent(location.province) ILIKE unaccent(:term))`,
        { term: `%${query.term}%` },
      );
    }

    // Apply sorting
    const allowedSortFields = ['createdAt', 'updatedAt', 'address', 'city', 'province'];
    const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';

    queryBuilder.orderBy(`location.${sortField}`, sortDirection);

    // Apply pagination
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
  async findOne(id: string): Promise<Location> {
    if (!id) {
      throw new BadRequestException('ID địa điểm không được để trống');
    }

    const location = await this.locationRepository.findOne({
      where: { id },
      relations: ['vendor'],
    });
    if (!location) {
      throw new NotFoundException(`Không tìm thấy địa điểm với ID ${id}`);
    }
    return location;
  }
  //#endregion findOne

  //#region updateLocation
  async updateLocation(id: string, updateLocationDto: UpdateLocationDto): Promise<Location> {
    const location = await this.findOne(id);

    // Validate coordinates if provided
    if (updateLocationDto.latitude !== undefined || updateLocationDto.longitude !== undefined) {
      if (updateLocationDto.latitude === undefined || updateLocationDto.longitude === undefined) {
        throw new BadRequestException('Cả latitude và longitude phải được cung cấp cùng nhau');
      }
      if (updateLocationDto.latitude < -90 || updateLocationDto.latitude > 90) {
        throw new BadRequestException('Latitude phải nằm trong khoảng từ -90 đến 90 độ');
      }
      if (updateLocationDto.longitude < -180 || updateLocationDto.longitude > 180) {
        throw new BadRequestException('Longitude phải nằm trong khoảng từ -180 đến 180 độ');
      }
    }

    // Check for duplicate address if address is being updated
    if (updateLocationDto.address || updateLocationDto.city || updateLocationDto.province) {
      const existingLocation = await this.locationRepository.findOne({
        where: {
          vendor: { id: location.vendor.id },
          address: updateLocationDto.address || location.address,
          city: updateLocationDto.city || location.city,
          province: updateLocationDto.province || location.province,
          id: Not(id)
        }
      });
      if (existingLocation) {
        throw new ConflictException('Vendor đã có địa điểm này');
      }
    }

    Object.assign(location, updateLocationDto);
    return this.locationRepository.save(location);
  }
  //#endregion updateLocation

  //#region deleteLocation
  async deleteLocation(id: string): Promise<void> {
    const location = await this.findOne(id);

    // Check if location is being used in any bookings
    const hasBookings = await this.locationRepository
      .createQueryBuilder('location')
      .leftJoin('location.bookings', 'booking')
      .where('location.id = :id', { id })
      .andWhere('booking.id IS NOT NULL')
      .getOne();

    if (hasBookings) {
      throw new ConflictException('Không thể xóa địa điểm đang được sử dụng trong đơn hàng');
    }

    await this.locationRepository.remove(location);
  }
  //#endregion deleteLocation

  async searchLocations(searchDto: SearchLocationDto) {
    try {
      const { keyword, address, district, ward, city, province } = searchDto;
      
      // Build where conditions
      const whereConditions: any[] = [];

      // If keyword is provided, search in all text fields
      if (keyword) {
        whereConditions.push(
          { address: ILike(`%${keyword}%`) },
          { district: ILike(`%${keyword}%`) },
          { ward: ILike(`%${keyword}%`) },
          { city: ILike(`%${keyword}%`) },
          { province: ILike(`%${keyword}%`) }
        );
      }

      // Add specific field conditions if provided
      if (address) {
        whereConditions.push({ address: ILike(`%${address}%`) });
      }
      if (district) {
        whereConditions.push({ district: ILike(`%${district}%`) });
      }
      if (ward) {
        whereConditions.push({ ward: ILike(`%${ward}%`) });
      }
      if (city) {
        whereConditions.push({ city: ILike(`%${city}%`) });
      }
      if (province) {
        whereConditions.push({ province: ILike(`%${province}%`) });
      }

      // If no conditions were provided, return all locations
      const where = whereConditions.length > 0 ? whereConditions : {};

      const locations = await this.locationRepository.find({
        where,
        relations: ['vendor'],
        order: {
          createdAt: 'DESC'
        }
      });

      return {
        data: locations,
        total: locations.length
      };
    } catch (error) {
      throw new BadRequestException('Không thể tìm kiếm địa điểm: ' + error.message);
    }
  }
}