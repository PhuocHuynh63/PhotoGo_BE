import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationAvailability } from './entities/location-availability.entity';
import { Location } from './entities/location.entity';
import { CreateLocationTimeScheduleDto } from './dto/create-location-time-schedule.dto';
import { UpdateLocationAvailabilityDto } from './dto/update-location-availability.dto';
import { Between } from 'typeorm';
import { FindLocationAvailabilityDto } from './dto/find-location.dto';
import { LocationWorkingDate } from './entities/location-workingdate.entity';
import { LocationSlotTime } from './entities/location-slot-time.entity';
import { CreateLocationSlotTimeDto } from './dto/create-location-slot-time.dto';
import { UpdateLocationSlotTimeDto } from './dto/update-location-slot-time.dto';
import { CreateLocationWorkingDateDto } from './dto/create-location-working-date.dto';
import { LocationSlotTimeWorkingDate } from './entities/location-slot-time-working-date.entity';
import { In } from 'typeorm';

@Injectable()
export class LocationAvailabilityService {
  private readonly logger = new Logger(LocationAvailabilityService.name);

    // Helper function to convert DD/MM/YYYY to YYYY-MM-DD
    private convertDateFormat(dateStr: string): string {
        if (!dateStr) return null;
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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
      private formatLocationWorkingDates(locationWorkingDate: LocationWorkingDate): any {
        if (!locationWorkingDate) return locationWorkingDate;
        return this.formatDate(locationWorkingDate.date);
      }

  // Helper function to format slot times
  private formatSlotTimes(slotTime: LocationSlotTime & { maxParallelBookings?: number }): any {
    if (!slotTime) return slotTime;
    return {
      slot: slotTime.slot,
      startSlotTime: slotTime.startSlotTime,
      endSlotTime: slotTime.endSlotTime,
      isStrictTimeBlocking: slotTime.isStrictTimeBlocking,
      maxParallelBookings: slotTime.maxParallelBookings || 1
    };
  }

  constructor(
    @InjectRepository(LocationAvailability)
    private locationAvailabilityRepository: Repository<LocationAvailability>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(LocationWorkingDate)
    private locationWorkingDateRepository: Repository<LocationWorkingDate>,
    @InjectRepository(LocationSlotTime)
    private locationSlotTimeRepository: Repository<LocationSlotTime>,
    @InjectRepository(LocationSlotTimeWorkingDate)
    private locationSlotTimeWorkingDateRepository: Repository<LocationSlotTimeWorkingDate>,
  ) {}

  // Helper function to generate dates for the current week
  private generateWeekDates(dateStr: string): Date[] {
    const dates: Date[] = [];
    // Convert DD/MM/YYYY to Date object
    const [day, month, year] = dateStr.split('/');
    const currentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    // Set to start of week (Monday)
    const dayOfWeek = currentDate.getDay();
    const diff = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
    currentDate.setDate(diff);
    
    // Generate dates for the week
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }

  async create(locationId: string, createLocationTimeScheduleDto: CreateLocationTimeScheduleDto): Promise<LocationAvailability> {
    const location = await this.locationRepository.findOne({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException('Vị trí không tồn tại');
    }

    // Validate time range
    const start = new Date(`2000-01-01T${createLocationTimeScheduleDto.startTime}`);
    const end = new Date(`2000-01-01T${createLocationTimeScheduleDto.endTime}`);
    if (start >= end) {
      throw new BadRequestException('Thời gian bắt đầu phải trước thời gian kết thúc');
    }

    // Create LocationAvailability
    const availability = this.locationAvailabilityRepository.create({
      startTime: createLocationTimeScheduleDto.startTime,
      endTime: createLocationTimeScheduleDto.endTime,
      isAvailable: createLocationTimeScheduleDto.isAvailable,
      location,
    });

    const savedAvailability = await this.locationAvailabilityRepository.save(availability);

    // Generate dates for the week using DD/MM/YYYY format
    const weekDates = this.generateWeekDates(createLocationTimeScheduleDto.date);
    
    // Create working dates for each day in the week
    const workingDates = await Promise.all(weekDates.map(async (date) => {
      const workingDate = this.locationWorkingDateRepository.create({
        date,
        locationAvailability: savedAvailability,
      });
      return await this.locationWorkingDateRepository.save(workingDate);
    }));

    // Create slot times
    const slotTimes: LocationSlotTime[] = [];
    const startTime = new Date(`2000-01-01T${createLocationTimeScheduleDto.startTime}`);
    const endTime = new Date(`2000-01-01T${createLocationTimeScheduleDto.endTime}`);
    const duration = 60; // 60 minutes per slot
    let currentTime = startTime;
    let slotNumber = 1;

    while (currentTime < endTime) {
      const slotEndTime = new Date(currentTime.getTime() + duration * 60000);
      if (slotEndTime > endTime) break;

      const slotTime = this.locationSlotTimeRepository.create({
        locationAvailabilityId: savedAvailability.id,
        slot: slotNumber,
        startSlotTime: currentTime.toTimeString().slice(0, 5),
        endSlotTime: slotEndTime.toTimeString().slice(0, 5),
        isStrictTimeBlocking: true,
      });

      const savedSlotTime = await this.locationSlotTimeRepository.save(slotTime);

      // Create slot time working date relationships for each working date
      for (const workingDate of workingDates) {
        await this.locationSlotTimeWorkingDateRepository.save({
          slotTimeId: savedSlotTime.id,
          workingDateId: workingDate.id,
          maxParallelBookings: 1
        });
      }

      slotTimes.push(savedSlotTime);
      currentTime = slotEndTime;
      slotNumber++;
    }

    return {
      ...savedAvailability,
      workingDates: workingDates.map(date => this.formatLocationWorkingDates(date)),
      slotTimes: slotTimes.map(slotTime => this.formatSlotTimes(slotTime))
    };
  }

  async findAll(query: FindLocationAvailabilityDto): Promise<{
    data: LocationAvailability[];
    current: number;
    pageSize: number;
    totalPage: number;
    totalItem: number;
  }> {
    const { current, pageSize, sortBy, sortDirection, isAvailable } = query;
    const actualPageSize = Number(pageSize) * Number(pageSize);
    const queryBuilder = this.locationAvailabilityRepository.createQueryBuilder('location_availability')
      .leftJoinAndSelect('location_availability.location', 'location')
      .leftJoinAndSelect('location_availability.workingDates', 'workingDates')
      .leftJoinAndSelect('location_availability.slotTimes', 'slotTimes')
      .orderBy('location_availability.createdAt', sortDirection === 'asc' ? 'ASC' : 'DESC');

    if (isAvailable !== undefined) {
      queryBuilder.andWhere('location_availability.isAvailable = :isAvailable', { isAvailable });
    }

    const [data, total] = await queryBuilder
      .skip((Number(current) - 1) * Number(pageSize))
      .take(Number(actualPageSize))
      .getManyAndCount();

    // Format dates and slot times in response
    const formattedData = await Promise.all(data.map(async availability => {
      // Get all slot time working dates for this availability
      const slotTimeWorkingDates = await this.locationSlotTimeWorkingDateRepository.find({
        where: {
          slotTimeId: In(availability.slotTimes.map(st => st.id)),
          workingDateId: In(availability.workingDates.map(wd => wd.id))
        }
      });

      // Create a map of slot time id to maxParallel for each working date
      const maxParallelMap = new Map();
      slotTimeWorkingDates.forEach(stwd => {
        const key = `${stwd.slotTimeId}-${stwd.workingDateId}`;
        maxParallelMap.set(key, stwd.maxParallelBookings);
      });

      return {
        ...availability,
        workingDates: availability.workingDates?.map(workingDate => 
          this.formatLocationWorkingDates(workingDate)
        ),
        slotTimes: availability.slotTimes?.map(slotTime => {
          const workingDateId = availability.workingDates[0]?.id;
          const key = `${slotTime.id}-${workingDateId}`;
          return {
            ...this.formatSlotTimes(slotTime),
            maxParallelBookings: maxParallelMap.get(key) || 1
          };
        })
      };
    }));

    return {
      data: formattedData,
      current: Number(current),
      pageSize: Number(pageSize),
      totalPage: Math.ceil(total / Number(pageSize)),
      totalItem: total,
    };
  }

  async findOne(id: string): Promise<LocationAvailability> {
    const availability = await this.locationAvailabilityRepository
      .createQueryBuilder('location_availability')
      .leftJoinAndSelect('location_availability.location', 'location')
      .leftJoinAndSelect('location_availability.workingDates', 'workingDates')
      .leftJoinAndSelect('location_availability.slotTimes', 'slotTimes')
      .where('location_availability.id = :id', { id })
      .getOne();

    if (!availability) {
      throw new NotFoundException('Vị trí sẵn sàng không tồn tại');
    }

    // Get all slot time working dates for this availability
    const slotTimeWorkingDates = await this.locationSlotTimeWorkingDateRepository.find({
      where: {
        slotTimeId: In(availability.slotTimes.map(st => st.id)),
        workingDateId: In(availability.workingDates.map(wd => wd.id))
      }
    });

    // Create a map of slot time id to maxParallel for each working date
    const maxParallelMap = new Map();
    slotTimeWorkingDates.forEach(stwd => {
      const key = `${stwd.slotTimeId}-${stwd.workingDateId}`;
      maxParallelMap.set(key, stwd.maxParallelBookings);
    });

    // Format dates and slot times in response
    return {
      ...availability,
      workingDates: availability.workingDates?.map(workingDate => 
        this.formatLocationWorkingDates(workingDate)
      ),
      slotTimes: availability.slotTimes?.map(slotTime => {
        const workingDateId = availability.workingDates[0]?.id;
        const key = `${slotTime.id}-${workingDateId}`;
        return {
          ...this.formatSlotTimes(slotTime),
          maxParallelBookings: maxParallelMap.get(key) || 1
        };
      })
    };
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
    const actualPageSize = Number(pageSize) * Number(pageSize);
    const queryBuilder = this.locationAvailabilityRepository.createQueryBuilder('location_availability')
      .leftJoinAndSelect('location_availability.location', 'location')
      .leftJoinAndSelect('location_availability.workingDates', 'workingDates')
      .leftJoinAndSelect('location_availability.slotTimes', 'slotTimes')
      .where('location_availability.location_id = :locationId', { locationId })
      .orderBy('location_availability.createdAt', sortDirection === 'asc' ? 'ASC' : 'DESC');

    if (isAvailable) {
      queryBuilder.where('location_availability.isAvailable = :isAvailable', { isAvailable });
    }

    if (sortBy) {
      queryBuilder.orderBy(`location_availability.${sortBy}`, sortDirection === 'asc' ? 'ASC' : 'DESC');
    }
    const skip = (Number(current) - 1) * Number(pageSize);
    const take = Number(actualPageSize);
    const [data, total] = await queryBuilder.skip(skip).take(take).getManyAndCount();
    const totalPage = Math.ceil(total / Number(pageSize));

    // Format dates and slot times in response
    const formattedData = await Promise.all(data.map(async availability => {
      // Get all slot time working dates for this availability
      const slotTimeWorkingDates = await this.locationSlotTimeWorkingDateRepository.find({
        where: {
          slotTimeId: In(availability.slotTimes.map(st => st.id)),
          workingDateId: In(availability.workingDates.map(wd => wd.id))
        }
      });

      // Create a map of slot time id to maxParallel for each working date
      const maxParallelMap = new Map();
      slotTimeWorkingDates.forEach(stwd => {
        const key = `${stwd.slotTimeId}-${stwd.workingDateId}`;
        maxParallelMap.set(key, stwd.maxParallelBookings);
      });

      return {
        ...availability,
        workingDates: availability.workingDates?.map(workingDate => 
          this.formatLocationWorkingDates(workingDate)
        ),
        slotTimes: availability.slotTimes?.map(slotTime => {
          const workingDateId = availability.workingDates[0]?.id;
          const key = `${slotTime.id}-${workingDateId}`;
          return {
            ...this.formatSlotTimes(slotTime),
            maxParallelBookings: maxParallelMap.get(key) || 1
          };
        })
      };
    }));

    return {
      data: formattedData,
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
    const actualPageSize = Number(pageSize) * Number(pageSize);

    // Convert dates from DD/MM/YYYY to YYYY-MM-DD
    const convertedStartDate = this.convertDateFormat(startDate);
    const convertedEndDate = this.convertDateFormat(endDate);

    console.log('Date range:', {
      startDate,
      endDate,
      convertedStartDate,
      convertedEndDate
    });

    const queryBuilder = this.locationAvailabilityRepository.createQueryBuilder('location_availability')
      .leftJoinAndSelect('location_availability.location', 'location')
      .leftJoinAndSelect('location_availability.workingDates', 'workingDates')
      .leftJoinAndSelect('location_availability.slotTimes', 'slotTimes')
      .where('workingDates.date BETWEEN :startDate AND :endDate', { 
        startDate: convertedStartDate,
        endDate: convertedEndDate
      });

    if (isAvailable) {
      queryBuilder.andWhere('location_availability.isAvailable = :isAvailable', { isAvailable });
    }

    if (sortBy) {
      queryBuilder.orderBy(`location_availability.${sortBy}`, sortDirection === 'asc' ? 'ASC' : 'DESC');
    } else {
      queryBuilder.orderBy('location_availability.createdAt', sortDirection === 'asc' ? 'ASC' : 'DESC');
    }

    const skip = (Number(current) - 1) * Number(pageSize);
    const take = Number(actualPageSize);

    // Log the final query
    const [querySql, queryParams] = queryBuilder.getQueryAndParameters();
    console.log('Query:', querySql);
    console.log('Parameters:', queryParams);

    const [data, total] = await queryBuilder.skip(skip).take(take).getManyAndCount();
    console.log('Result:', { data, total });

    const totalPage = Math.ceil(total / Number(pageSize));

    // Format dates and slot times in response
    const formattedData = await Promise.all(data.map(async availability => {
      // Get all slot time working dates for this availability
      const slotTimeWorkingDates = await this.locationSlotTimeWorkingDateRepository.find({
        where: {
          slotTimeId: In(availability.slotTimes.map(st => st.id)),
          workingDateId: In(availability.workingDates.map(wd => wd.id))
        }
      });

      // Create a map of slot time id to maxParallel for each working date
      const maxParallelMap = new Map();
      slotTimeWorkingDates.forEach(stwd => {
        const key = `${stwd.slotTimeId}-${stwd.workingDateId}`;
        maxParallelMap.set(key, stwd.maxParallelBookings);
      });

      return {
        ...availability,
        workingDates: availability.workingDates?.map(workingDate => 
          this.formatLocationWorkingDates(workingDate)
        ),
        slotTimes: availability.slotTimes?.map(slotTime => {
          const workingDateId = availability.workingDates[0]?.id;
          const key = `${slotTime.id}-${workingDateId}`;
          return {
            ...this.formatSlotTimes(slotTime),
            maxParallelBookings: maxParallelMap.get(key) || 1
          };
        })
      };
    }));

    return {
      data: formattedData,
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
    const actualPageSize = Number(pageSize) * Number(pageSize);

    // Convert date from DD/MM/YYYY to YYYY-MM-DD
    const convertedDate = this.convertDateFormat(date);

    const queryBuilder = this.locationAvailabilityRepository.createQueryBuilder('location_availability')
      .leftJoinAndSelect('location_availability.location', 'location')
      .leftJoinAndSelect('location_availability.workingDates', 'workingDates')
      .leftJoinAndSelect('location_availability.slotTimes', 'slotTimes')
      .where('workingDates.date = :date', { date: convertedDate })
      .orderBy('location_availability.createdAt', sortDirection === 'asc' ? 'ASC' : 'DESC');

    if (isAvailable) {
      queryBuilder.where('location_availability.isAvailable = :isAvailable', { isAvailable });
    }

    if (sortBy) {
      queryBuilder.orderBy(`location_availability.${sortBy}`, sortDirection === 'asc' ? 'ASC' : 'DESC');
    }
    const skip = (Number(current) - 1) * Number(pageSize);
    const take = Number(actualPageSize);
    const [data, total] = await queryBuilder.skip(skip).take(take).getManyAndCount();
    const totalPage = Math.ceil(total / Number(pageSize));

    // Format dates and slot times in response
    const formattedData = await Promise.all(data.map(async availability => {
      // Get all slot time working dates for this availability
      const slotTimeWorkingDates = await this.locationSlotTimeWorkingDateRepository.find({
        where: {
          slotTimeId: In(availability.slotTimes.map(st => st.id)),
          workingDateId: In(availability.workingDates.map(wd => wd.id))
        }
      });

      // Create a map of slot time id to maxParallel for each working date
      const maxParallelMap = new Map();
      slotTimeWorkingDates.forEach(stwd => {
        const key = `${stwd.slotTimeId}-${stwd.workingDateId}`;
        maxParallelMap.set(key, stwd.maxParallelBookings);
      });

      return {
        ...availability,
        workingDates: availability.workingDates?.map(workingDate => 
          this.formatLocationWorkingDates(workingDate)
        ),
        slotTimes: availability.slotTimes?.map(slotTime => {
          const workingDateId = availability.workingDates[0]?.id;
          const key = `${slotTime.id}-${workingDateId}`;
          return {
            ...this.formatSlotTimes(slotTime),
            maxParallelBookings: maxParallelMap.get(key) || 1
          };
        })
      };
    }));

    return {
      data: formattedData,
      current: Number(current),
      pageSize: Number(pageSize),
      totalPage,
      totalItem: total,
    };
  }

  //Service slot time
  async createSlotTime(locationAvailabilityId: string, createLocationSlotTimeDto: CreateLocationSlotTimeDto): Promise<LocationSlotTime[]> {
    const availability = await this.locationAvailabilityRepository.findOne({
      where: { id: locationAvailabilityId },
      relations: ['workingDates'],
    });

    if (!availability) {
      throw new NotFoundException('Lịch làm việc không tồn tại');
    }

    const slotTimes: LocationSlotTime[] = [];
    const startTime = new Date(`2000-01-01T${availability.startTime}`);
    const endTime = new Date(`2000-01-01T${availability.endTime}`);
    const duration = 60; // 60 minutes per slot
    let currentTime = startTime;
    let slotNumber = 1;

    while (currentTime < endTime) {
      const slotEndTime = new Date(currentTime.getTime() + duration * 60000);
      if (slotEndTime > endTime) break;

      const slotTime = this.locationSlotTimeRepository.create({
        locationAvailabilityId,
        slot: slotNumber,
        startSlotTime: currentTime.toTimeString().slice(0, 5),
        endSlotTime: slotEndTime.toTimeString().slice(0, 5),
        isStrictTimeBlocking: createLocationSlotTimeDto.isStrictTimeBlocking,
      });

      const savedSlotTime = await this.locationSlotTimeRepository.save(slotTime);

      // Create slot time working date relationships for each working date
      for (const workingDate of availability.workingDates) {
        await this.locationSlotTimeWorkingDateRepository.save({
          slotTimeId: savedSlotTime.id,
          workingDateId: workingDate.id,
          maxParallelBookings: 1
        });
      }

      slotTimes.push(savedSlotTime);
      currentTime = slotEndTime;
      slotNumber++;
    }

    return slotTimes;
  }

  // get slot time
  async getSlotTime(locationAvailabilityId: string): Promise<LocationSlotTime[]> {
    const slotTimes = await this.locationSlotTimeRepository.find({
      where: { locationAvailability: { id: locationAvailabilityId } },
      relations: ['locationAvailability', 'locationAvailability.location'],
    });

    return slotTimes;
  }

  // update slot time
  async updateSlot(workingDateId: string, slotTimeId: string, updateLocationSlotTimeDto: UpdateLocationSlotTimeDto): Promise<LocationSlotTime> {
    const working = await this.locationSlotTimeWorkingDateRepository.findOne({
      where: { slotTimeId, workingDateId },
    });

    if (!working) {
      throw new NotFoundException('Không tìm thấy slot time working date');
    }

    const slotTime = await this.locationSlotTimeRepository.findOne({
      where: { id: slotTimeId },
    });


    // Check if we need to update isStrictTimeBlocking in slot time table
    if (updateLocationSlotTimeDto.isStrictTimeBlocking !== undefined) {
      if (updateLocationSlotTimeDto.isStrictTimeBlocking) {
        working.maxParallelBookings = 1;
        await this.locationSlotTimeWorkingDateRepository.save(working);
        return this.formatSlotTimes(slotTime);
      }

      // Update isStrictTimeBlocking in slot time table
      slotTime.isStrictTimeBlocking = updateLocationSlotTimeDto.isStrictTimeBlocking;
      await this.locationSlotTimeRepository.save(slotTime);
    }

    // Check if we need to update maxParallel in slot time working date table
    if (updateLocationSlotTimeDto.maxParallelBookings !== undefined) {
      // Only allow maxParallel update if isStrictTimeBlocking is false
      if (slotTime.isStrictTimeBlocking) {
        throw new BadRequestException('Block time phải là false mới cho phép nhiều booking trong cùng một slot');
      }

      // Validate maxParallelBookings
      if (updateLocationSlotTimeDto.maxParallelBookings < 1) {
        throw new BadRequestException('Số lượng booking tối đa phải lớn hơn 0');
      }
      if (updateLocationSlotTimeDto.maxParallelBookings > 10) {
        throw new BadRequestException('Số lượng booking tối đa không được vượt quá 10');
      }

      // Update maxParallel in slot time working date table
      await this.locationSlotTimeWorkingDateRepository.update(
        { slotTimeId, workingDateId },
        { maxParallelBookings: updateLocationSlotTimeDto.maxParallelBookings }
      );
    }

    return slotTime;
  }

  // delete slot time
  async deleteSlotTime(locationAvailabilityId: string, slotTimeId: string): Promise<void> {
    const slotTime = await this.locationSlotTimeRepository.findOne({
      where: { id: slotTimeId, locationAvailability: { id: locationAvailabilityId } },
    });

    if (!slotTime) {
      throw new NotFoundException('Không tìm thấy slot time');
    }

    await this.locationSlotTimeRepository.remove(slotTime);
  }

  // create location working date
  async createWorkingDate(locationAvailabilityId: string, createLocationWorkingDateDto: CreateLocationWorkingDateDto): Promise<LocationWorkingDate> {
    const locationAvailability = await this.locationAvailabilityRepository.findOne({
      where: { id: locationAvailabilityId },
    });

    if (!locationAvailability) {
      throw new NotFoundException('Lịch làm việc không tồn tại');
    }

    // Convert date from DD/MM/YYYY to YYYY-MM-DD and then to Date object
    const convertedDate = new Date(this.convertDateFormat(createLocationWorkingDateDto.date));

    const existingWorkingDate = await this.locationWorkingDateRepository.findOne({
      where: {
        date: convertedDate,
        locationAvailability: { id: locationAvailabilityId },
      },
    });
    
    if (existingWorkingDate) {
      throw new BadRequestException('Ngày làm việc đã tồn tại');
    }

    const workingDate = this.locationWorkingDateRepository.create({
      date: convertedDate,
      locationAvailability,
    });

    const savedWorkingDate = await this.locationWorkingDateRepository.save(workingDate);

    // Gán tất cả slot time vào working date mới
    const slotTimes = await this.locationSlotTimeRepository.find({
      where: { locationAvailabilityId },
    });
    for (const slotTime of slotTimes) {
      await this.locationSlotTimeWorkingDateRepository.save({
        slotTimeId: slotTime.id,
        workingDateId: savedWorkingDate.id,
        maxParallelBookings: 1,
      });
    }
    return this.formatLocationWorkingDates(savedWorkingDate);
  }
}