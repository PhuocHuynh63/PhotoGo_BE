import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationAvailability } from './entities/location-availability.entity';
import { Location } from './entities/location.entity';
import { CreateLocationAvailabilityDto } from './dto/create-location-availability.dto';
import { UpdateLocationAvailabilityDto } from './dto/update-location-availability.dto';
import { Between } from 'typeorm';
import { FindLocationAvailabilityDto } from './dto/find-location.dto';

@Injectable()
export class LocationAvailabilityService {
  private readonly logger = new Logger(LocationAvailabilityService.name);

    // Helper function to convert DD/MM/YYYY to YYYY-MM-DD
    private convertDateFormat(dateStr: string): string {
        if (!dateStr) return null;
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month}-${day}`;
      }
    
      // Helper function to format date to DD/MM/YYYY
      private formatDate(date: Date): string {
        if (!date) return null;
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
    
      // Helper function to format location availability dates
      private formatLocationAvailabilityDates(locationAvailability: LocationAvailability): any {
        if (!locationAvailability) return locationAvailability;
        return {
          ...locationAvailability,
          date: this.formatDate(locationAvailability.date),
        //   createdAt: this.formatDate(locationAvailability.createdAt),
        //   updatedAt: this.formatDate(locationAvailability.updatedAt),
        };
      }


  constructor(
    @InjectRepository(LocationAvailability)
    private locationAvailabilityRepository: Repository<LocationAvailability>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  async create(createLocationAvailabilityDto: CreateLocationAvailabilityDto): Promise<LocationAvailability> {
    const location = await this.locationRepository.findOne({
      where: { id: createLocationAvailabilityDto.locationId },
    });

    if (!location) {
      throw new NotFoundException('Vị trí không tồn tại');
    }

    // Validate time range
    const start = new Date(`2000-01-01T${createLocationAvailabilityDto.startTime}`);
    const end = new Date(`2000-01-01T${createLocationAvailabilityDto.endTime}`);
    if (start >= end) {
      throw new BadRequestException('Thời gian bắt đầu phải trước thời gian kết thúc');
    }

    const availability = this.locationAvailabilityRepository.create({
      ...createLocationAvailabilityDto,
      location,
    });

    return this.locationAvailabilityRepository.save(availability);
  }

  async findAll(query: FindLocationAvailabilityDto): Promise<{
    data: LocationAvailability[];
    current: number;
    pageSize: number;
    totalPage: number;
    totalItem: number;
  }> {
    const { current, pageSize, sortBy, sortDirection, isAvailable } = query;
    const queryBuilder = this.locationAvailabilityRepository.createQueryBuilder('location_availability')
      .leftJoinAndSelect('location_availability.location', 'location')
      .orderBy('location_availability.createdAt', sortDirection === 'asc' ? 'ASC' : 'DESC');

    if (isAvailable) {
      queryBuilder.where('location_availability.isAvailable = :isAvailable', { isAvailable });
    }

    if (sortBy) {
      queryBuilder.orderBy(`location_availability.${sortBy}`, sortDirection === 'asc' ? 'ASC' : 'DESC');
    }
    const skip = (Number(current) - 1) * Number(pageSize);
    const take = Number(pageSize);
    const locations = await queryBuilder.skip(skip).take(take).getMany();
    const total = await queryBuilder.getCount();
    const totalPage = Math.ceil(total / Number(pageSize));
    return {
      data: locations.map(this.formatLocationAvailabilityDates),
      current: Number(current),
      pageSize: Number(pageSize),
      totalPage,
      totalItem: total,
    };
  }

  async findOne(id: string): Promise<LocationAvailability> {
    const availability = await this.locationAvailabilityRepository.findOne({
      where: { id },
      relations: ['location', 'location.vendor'],
    });

    if (!availability) {
      throw new NotFoundException('Vị trí sẵn sàng không tồn tại');
    }

    return availability;
  }

  async update(id: string, updateLocationAvailabilityDto: UpdateLocationAvailabilityDto): Promise<LocationAvailability> {
    const availability = await this.locationAvailabilityRepository.findOne({
      where: { id },
      relations: ['location'],
    });

    if (!availability) {
      throw new NotFoundException('Vị trí sẵn sàng không tồn tại');
    }

    // Validate time range if both times are provided
    if (updateLocationAvailabilityDto.startTime && updateLocationAvailabilityDto.endTime) {
      const start = new Date(`2000-01-01T${updateLocationAvailabilityDto.startTime}`);
      const end = new Date(`2000-01-01T${updateLocationAvailabilityDto.endTime}`);
      if (start >= end) {
        throw new BadRequestException('Thời gian bắt đầu phải trước thời gian kết thúc');
      }
    }

    Object.assign(availability, updateLocationAvailabilityDto);
    return this.locationAvailabilityRepository.save(availability);
  }

  async remove(id: string): Promise<void> {
    const availability = await this.locationAvailabilityRepository.findOne({
      where: { id },
    });

    if (!availability) {
      throw new NotFoundException('Vị trí sẵn sàng không tồn tại');
    }

    await this.locationAvailabilityRepository.remove(availability);
  }

  async findByLocationId(query: FindLocationAvailabilityDto, locationId: string): Promise<{
    data: LocationAvailability[];
    current: number;
    pageSize: number;
    totalPage: number;
    totalItem: number;
  }> {
    const { current, pageSize, sortBy, sortDirection, isAvailable } = query;
    const queryBuilder = this.locationAvailabilityRepository.createQueryBuilder('location_availability')
      .leftJoinAndSelect('location_availability.location', 'location')
      .where('location_availability.location_id = :locationId', { locationId })
      .orderBy('location_availability.createdAt', sortDirection === 'asc' ? 'ASC' : 'DESC');

    if (isAvailable) {
      queryBuilder.where('location_availability.isAvailable = :isAvailable', { isAvailable });
    }

    if (sortBy) {
      queryBuilder.orderBy(`location_availability.${sortBy}`, sortDirection === 'asc' ? 'ASC' : 'DESC');
    }
    const skip = (Number(current) - 1) * Number(pageSize);
    const take = Number(pageSize);
    const locations = await queryBuilder.skip(skip).take(take).getMany();
    const total = await queryBuilder.getCount();
    const totalPage = Math.ceil(total / Number(pageSize));
    return {
      data: locations.map(this.formatLocationAvailabilityDates),
      current: Number(current),
      pageSize: Number(pageSize),
      totalPage,
      totalItem: total,
    };
  }

  async findByDateRange(startDate: string, endDate: string, query: FindLocationAvailabilityDto): Promise<{
    data: LocationAvailability[];
    current: number;
    pageSize: number;
    totalPage: number;
    totalItem: number;
  }> {
    const { current, pageSize, sortBy, sortDirection, isAvailable } = query;
    const queryBuilder = this.locationAvailabilityRepository.createQueryBuilder('location_availability')
      .leftJoinAndSelect('location_availability.location', 'location')
      .where('location_availability.date BETWEEN :startDate AND :endDate', { startDate: this.convertDateFormat(startDate), endDate: this.convertDateFormat(endDate) })
      .orderBy('location_availability.createdAt', sortDirection === 'asc' ? 'ASC' : 'DESC');

    if (sortBy) {
      queryBuilder.orderBy(`location_availability.${sortBy}`, sortDirection === 'asc' ? 'ASC' : 'DESC');
    }
    const skip = (Number(current) - 1) * Number(pageSize);
    const take = Number(pageSize);
    const locations = await queryBuilder.skip(skip).take(take).getMany();
    const total = await queryBuilder.getCount();
    const totalPage = Math.ceil(total / Number(pageSize));
    return {
      data: locations.map(this.formatLocationAvailabilityDates),
      current: Number(current),
      pageSize: Number(pageSize),
      totalPage,
      totalItem: total,
    };
  }

  async findByDate(date: string, query: FindLocationAvailabilityDto): Promise<{
    data: LocationAvailability[];
    current: number;
    pageSize: number;
    totalPage: number;
    totalItem: number;
  }> {
    const { current, pageSize, sortBy, sortDirection, isAvailable } = query;
    const queryBuilder = this.locationAvailabilityRepository.createQueryBuilder('location_availability')
      .leftJoinAndSelect('location_availability.location', 'location')
      .where('location_availability.date = :date', { date: date })
      .orderBy('location_availability.createdAt', sortDirection === 'asc' ? 'ASC' : 'DESC');

    if (isAvailable) {
      queryBuilder.where('location_availability.isAvailable = :isAvailable', { isAvailable });
    }

    if (sortBy) {
      queryBuilder.orderBy(`location_availability.${sortBy}`, sortDirection === 'asc' ? 'ASC' : 'DESC');
    }
    const skip = (Number(current) - 1) * Number(pageSize);
    const take = Number(pageSize);
    const locations = await queryBuilder.skip(skip).take(take).getMany();
    const total = await queryBuilder.getCount();
    const totalPage = Math.ceil(total / Number(pageSize));
    return {
      data: locations.map(this.formatLocationAvailabilityDates),
      current: Number(current),
      pageSize: Number(pageSize),
      totalPage,
      totalItem: total,
    };
  }
}