import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationAvailability } from './entities/location-availability.entity';
import { Location } from './entities/location.entity';
import { CreateLocationTimeScheduleDto } from './dto/create-location-time-schedule.dto';
import { UpdateLocationAvailabilityDto } from './dto/update-location-availability.dto';
import { Between } from 'typeorm';
import { FindLocationAvailabilityDto, FindLocationAvailabilityWithDateDto } from './dto/find-location.dto';
import { LocationWorkingDate } from './entities/location-workingdate.entity';
import { LocationSlotTime } from './entities/location-slot-time.entity';
import { CreateLocationSlotTimeDto } from './dto/create-location-slot-time.dto';
import { UpdateLocationSlotTimeDto } from './dto/update-location-slot-time.dto';
import { CreateLocationWorkingDateDto } from './dto/create-location-working-date.dto';
import { LocationSlotTimeWorkingDate } from './entities/location-slot-time-working-date.entity';
import { In } from 'typeorm';
import { UpdateTimeOnlyForDayDto, DayOfWeek } from './dto/update-time-only-for-saturday.dto';
import { UpdateLocationWorkingDateStatusDto } from './dto/update-location-working-date.dto';
import { DataSource } from 'typeorm';
import { BookingStatus } from 'src/constants/booking.enum';

@Injectable()
export class LocationAvailabilityService {
  private readonly logger = new Logger(LocationAvailabilityService.name);

      // Helper function to convert DD/MM/YYYY to YYYY-MM-DD
      private convertDateFormat(dateStr: string): string {
        if (!dateStr) {
          throw new BadRequestException('Ngày không được để trống');
        }
    
        // Validate date format
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!dateRegex.test(dateStr)) {
          throw new BadRequestException('Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng DD/MM/YYYY');
        }
    
        const [day, month, year] = dateStr.split('/');
        
        // Validate date values
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (date.getFullYear() !== parseInt(year) || 
            date.getMonth() !== parseInt(month) - 1 || 
            date.getDate() !== parseInt(day)) {
          throw new BadRequestException('Ngày không hợp lệ');
        }
    
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    
      // Helper function to format date to DD/MM/YYYY
      private formatDate(date: Date): string {
        if (!date) {
          return null;
        }
        
        try {
          const d = new Date(date);
          if (isNaN(d.getTime())) {
            return null;
          }
          
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        } catch (error) {
          this.logger.error(`Error formatting date: ${error.message}`);
          return null;
        }
      }
    
      // Helper function to format location availability dates
      private formatLocationWorkingDates(locationWorkingDate: LocationWorkingDate): any {
        if (!locationWorkingDate) return locationWorkingDate;
        return {
          id: locationWorkingDate.id,
          date: this.formatDate(locationWorkingDate.date),
          isAvailable: locationWorkingDate.isAvailable,
        };
      }

  // Helper function to format slot times
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private async formatSlotTimes(slotTime: LocationSlotTime): Promise<any> {
    if (!slotTime) return slotTime;

    return {
      id: slotTime.id,
      slot: slotTime.slot,
      startSlotTime: slotTime.startSlotTime,
      endSlotTime: slotTime.endSlotTime,
      isStrictTimeBlocking: slotTime.isStrictTimeBlocking,
    };
  }

  private async formatSlotTimeWorkingDates(slotTimeWorkingDate: LocationSlotTimeWorkingDate): Promise<any> {
    if (!slotTimeWorkingDate) return null;

    try {
      // Get all bookings for this slot time working date
      const bookings = await this.dataSource
        .createQueryBuilder()
        .select('booking.id, booking.time, service_concept.duration, booking.date, booking.status, booking.created_at')
        .from('booking', 'booking')
        .innerJoin('booking.serviceConcept', 'service_concept')
        .innerJoin('booking.location', 'location')
        .innerJoin('location.availability', 'availability')
        .innerJoin('availability.slotTimes', 'slotTimes')
        .innerJoin('slotTimes.locationSlotTimeWorkingDates', 'slotTimeWorkingDates')
        .where('slotTimeWorkingDates.id = :slotTimeWorkingDateId', { slotTimeWorkingDateId: slotTimeWorkingDate.id })
        .andWhere('booking.status IN (:...statuses)', { 
          statuses: [BookingStatus.PAID, BookingStatus.PENDING] 
        })
        .andWhere('booking.date = :bookingDate', { bookingDate: slotTimeWorkingDate.workingDate.date })
        .getRawMany();

      let alreadyBooked = 0;

      // Check for overlapping bookings
      if (slotTimeWorkingDate.slotTime) {
        const slotStartMinutes = this.timeToMinutes(slotTimeWorkingDate.slotTime.startSlotTime);
        const slotEndMinutes = this.timeToMinutes(slotTimeWorkingDate.slotTime.endSlotTime);
        const timeoutMinutes = 15; // 15 minutes timeout
        const timeoutDate = new Date(Date.now() - timeoutMinutes * 60 * 1000);

        for (const booking of bookings) {
          // Skip PENDING bookings that have timed out
          if (booking.status === BookingStatus.PENDING && new Date(booking.created_at) < timeoutDate) {
            continue; // Skip timed out bookings
          }

          // Nếu duration = 0 thì mặc định là 60 phút
          const duration = booking.duration === 0 ? 60 : booking.duration;
          const bookingStartMinutes = this.timeToMinutes(booking.time);
          const bookingEndMinutes = bookingStartMinutes + duration;

          if (
            (bookingStartMinutes >= slotStartMinutes && bookingStartMinutes < slotEndMinutes) ||
            (bookingEndMinutes > slotStartMinutes && bookingEndMinutes <= slotEndMinutes) ||
            (bookingStartMinutes <= slotStartMinutes && bookingEndMinutes >= slotEndMinutes)
          ) {
            alreadyBooked++;
          }
        }
      }

      const isAvailable = alreadyBooked < (slotTimeWorkingDate.maxParallelBookings || 1);

      return {
        id: slotTimeWorkingDate.id,
        date: slotTimeWorkingDate.workingDate?.date ? this.formatDate(slotTimeWorkingDate.workingDate.date) : null,
        startSlotTime: slotTimeWorkingDate.slotTime?.startSlotTime || null,
        endSlotTime: slotTimeWorkingDate.slotTime?.endSlotTime || null,
        maxParallelBookings: slotTimeWorkingDate.maxParallelBookings || 1,
        alreadyBooked: alreadyBooked || 0,
        isAvailable: isAvailable || false,
      };
    } catch (error) {
      this.logger.error(`Error formatting slot time working date: ${error.message}`);
      return null;
    }
  }

  // Helper function to format multiple slot times
  private async formatSlotTimesArray(slotTimes: LocationSlotTime[]): Promise<any[]> {
    if (!slotTimes) return [];
    return Promise.all(slotTimes.map(slotTime => this.formatSlotTimes(slotTime)));
  }

  // Helper function to format multiple slot time working dates
  private async formatSlotTimeWorkingDatesArray(slotTimeWorkingDates: LocationSlotTimeWorkingDate[]): Promise<any[]> {
    if (!slotTimeWorkingDates) return [];
    return Promise.all(slotTimeWorkingDates.map(slotTimeWorkingDate => this.formatSlotTimeWorkingDates(slotTimeWorkingDate)));
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
    private dataSource: DataSource,
  ) {}

  // Helper function to generate dates for the current week
  private generateWeekDates(dateStr: string): Date[] {
    if (!dateStr) {
      throw new BadRequestException('Ngày không được để trống');
    }

    // Validate date format
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!dateRegex.test(dateStr)) {
      throw new BadRequestException('Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng DD/MM/YYYY');
    }

    const dates: Date[] = [];
    // Convert DD/MM/YYYY to Date object
    const [day, month, year] = dateStr.split('/');
    const currentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    // Validate date values
    if (currentDate.getFullYear() !== parseInt(year) || 
        currentDate.getMonth() !== parseInt(month) - 1 || 
        currentDate.getDate() !== parseInt(day)) {
      throw new BadRequestException('Ngày không hợp lệ');
    }
    
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

    //check date, startTime, endTime, location_id duplicated?
    const existingAvailability = await this.locationAvailabilityRepository.findOne({
      where: {
        location: {
          id: locationId
        },
        workingDates: {
          date: new Date(this.convertDateFormat(createLocationTimeScheduleDto.startDate)),
        },
        startTime: createLocationTimeScheduleDto.startTime,
        endTime: createLocationTimeScheduleDto.endTime,
      },
    });
    if (existingAvailability) {
      throw new BadRequestException('Thời gian và ngày của chỗ này đã tồn tại');
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

    // Generate dates between startDate and endDate, excluding Sundays
    const startDate = new Date(this.convertDateFormat(createLocationTimeScheduleDto.startDate));
    const endDate = new Date(this.convertDateFormat(createLocationTimeScheduleDto.endDate));
    const workingDates: Date[] = [];
    
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      workingDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Create working dates for each day
    const savedWorkingDates = await Promise.all(workingDates.map(async (date) => {
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
      for (const workingDate of savedWorkingDates) {
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
      workingDates: savedWorkingDates.map(date => this.formatLocationWorkingDates(date)),
      slotTimes: await this.formatSlotTimesArray(slotTimes)
    };
  }

  async findAll(query: FindLocationAvailabilityDto): Promise<{
    data: (LocationAvailability & { slotTimeWorkingDates: any[] })[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    }
  }> {
    const { current, pageSize, sortBy, sortDirection, isAvailable } = query;
    const actualPageSize = Number(pageSize);
    const queryBuilder = this.locationAvailabilityRepository.createQueryBuilder('location_availability')
      .leftJoinAndSelect('location_availability.location', 'location')
      .leftJoinAndSelect('location_availability.workingDates', 'workingDates')
      .leftJoinAndSelect('location_availability.slotTimes', 'slotTimes')
      .orderBy('location_availability.createdAt', sortDirection === 'asc' ? 'ASC' : 'DESC');

    if (isAvailable !== undefined) {
      queryBuilder.andWhere('location_availability.isAvailable = :isAvailable', { isAvailable });
    }

    const [data, total] = await queryBuilder
      .skip((Number(current) - 1) * actualPageSize)
      .take(actualPageSize)
      .getManyAndCount();

    // Format dates and slot times in response
    const formattedData = await Promise.all(data.map(async availability => {
      // Get all slot time working dates for this availability
      const slotTimeWorkingDates = await this.locationSlotTimeWorkingDateRepository.find({
        where: {
          slotTimeId: In(availability.slotTimes.map(st => st.id)),
          workingDateId: In(availability.workingDates.map(wd => wd.id))
        },
        relations: ['slotTime', 'workingDate']
      });

      return {
        ...availability,
        workingDates: availability.workingDates?.map(workingDate => 
          this.formatLocationWorkingDates(workingDate)
        ),
        slotTimes: await this.formatSlotTimesArray(availability.slotTimes),
        slotTimeWorkingDates: await this.formatSlotTimeWorkingDatesArray(slotTimeWorkingDates)
      };
    }));

    return {
      data: formattedData,
      pagination: {
        current: Number(current),
        pageSize: actualPageSize,
        totalPage: Math.ceil(total / actualPageSize),
        totalItem: total,
      }
    };
  }

  async findOne(id: string): Promise<LocationAvailability & { slotTimeWorkingDates: any[] }> {
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
      },
      relations: ['slotTime', 'workingDate']
    });

    return {
      ...availability,
      workingDates: availability.workingDates?.map(workingDate => 
        this.formatLocationWorkingDates(workingDate)
      ),
      slotTimes: await this.formatSlotTimesArray(availability.slotTimes),
      slotTimeWorkingDates: await this.formatSlotTimeWorkingDatesArray(slotTimeWorkingDates)
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

  async findByLocationIdAndDate(locationId: string, query: FindLocationAvailabilityWithDateDto): Promise<{

    data: LocationAvailability[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    }
  }> {
    const { isAvailable, date, current, pageSize, sortBy, sortDirection } = query;
    const actualPageSize = Number(pageSize);
    const queryBuilder = this.locationAvailabilityRepository.createQueryBuilder('location_availability')
      .leftJoinAndSelect('location_availability.location', 'location')
      .leftJoinAndSelect('location_availability.workingDates', 'workingDates')
      .leftJoinAndSelect('location_availability.slotTimes', 'slotTimes')
      .andWhere('location_availability.location_id = :locationId', { locationId })
      .andWhere('workingDates.date = :date', { date: this.convertDateFormat(date) })
      .orderBy('location_availability.createdAt', sortDirection === 'asc' ? 'ASC' : 'DESC');

    if (isAvailable !== undefined) {
      queryBuilder.andWhere('location_availability.isAvailable = :isAvailable', { isAvailable });
    }
    if (date) {
      queryBuilder.andWhere('workingDates.date = :date', { date: this.convertDateFormat(date) });
    }

    if (sortBy) {
      queryBuilder.orderBy(`location_availability.${sortBy}`, sortDirection === 'asc' ? 'ASC' : 'DESC');
    }
    const [data, total] = await queryBuilder
      .skip((Number(current) - 1) * actualPageSize)
      .take(actualPageSize)
      .getManyAndCount();

    const formattedData = await Promise.all(data.map(async availability => {
      const slotTimeWorkingDates = await this.locationSlotTimeWorkingDateRepository.find({
        where: {
          slotTimeId: In(availability.slotTimes.map(st => st.id)),
          workingDateId: In(availability.workingDates.map(wd => wd.id))
        },
        relations: ['slotTime', 'workingDate']
      });

      return {
        ...availability,
        workingDates: availability.workingDates?.map(workingDate => 
          this.formatLocationWorkingDates(workingDate)
        ),
        slotTimes: await this.formatSlotTimesArray(availability.slotTimes),
        slotTimeWorkingDates: await this.formatSlotTimeWorkingDatesArray(slotTimeWorkingDates)
      };
    }));

    return {
      data: formattedData,
      pagination: {
        current: Number(current),
        pageSize: actualPageSize,
        totalPage: Math.ceil(total / actualPageSize),
        totalItem: total,
      }
    };
  }

  async findByLocationId(locationId: string, query: FindLocationAvailabilityDto): Promise<{
    data: (LocationAvailability & { slotTimeWorkingDates: any[] })[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    }
  }> {
    const { isAvailable, current, pageSize, sortBy, sortDirection } = query;
    const actualPageSize = Number(pageSize);
    const queryBuilder = this.locationAvailabilityRepository.createQueryBuilder('location_availability')
      .leftJoinAndSelect('location_availability.location', 'location')
      .leftJoinAndSelect('location_availability.workingDates', 'workingDates')
      .leftJoinAndSelect('location_availability.slotTimes', 'slotTimes')
      .andWhere('location_availability.location_id = :locationId', { locationId })
      .orderBy('location_availability.createdAt', sortDirection === 'asc' ? 'ASC' : 'DESC');

    if (isAvailable !== undefined) {
      queryBuilder.andWhere('location_availability.isAvailable = :isAvailable', { isAvailable });
    }

    if (sortBy) {
      queryBuilder.orderBy(`location_availability.${sortBy}`, sortDirection === 'asc' ? 'ASC' : 'DESC');
    }

    const [data, total] = await queryBuilder
      .skip((Number(current) - 1) * actualPageSize)
      .take(actualPageSize)
      .getManyAndCount();

    // Format dates and slot times in response
    const formattedData = await Promise.all(data.map(async availability => {
      // Get all slot time working dates for this availability
      const slotTimeWorkingDates = await this.locationSlotTimeWorkingDateRepository.find({
        where: {
          slotTimeId: In(availability.slotTimes.map(st => st.id)),
          workingDateId: In(availability.workingDates.map(wd => wd.id))
        },
        relations: ['slotTime', 'workingDate']
      });

      return {
        ...availability,
        workingDates: availability.workingDates?.map(workingDate => 
          this.formatLocationWorkingDates(workingDate)
        ),
        slotTimes: await this.formatSlotTimesArray(availability.slotTimes),
        slotTimeWorkingDates: []
      };
    }));

    return {
      data: formattedData,
      pagination: {
        current: Number(current),
        pageSize: actualPageSize,
        totalPage: Math.ceil(total / actualPageSize),
        totalItem: total,
      }
    };
  }

  async findByDateRange(startDate: string, endDate: string, query: FindLocationAvailabilityDto): Promise<{
    data: (LocationAvailability & { slotTimeWorkingDates: any[] })[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    }
  }> {
    const { current, pageSize, sortBy, sortDirection, isAvailable } = query;
    const actualPageSize = Number(pageSize);

    // Convert dates from DD/MM/YYYY to YYYY-MM-DD
    const convertedStartDate = this.convertDateFormat(startDate);
    const convertedEndDate = this.convertDateFormat(endDate);

    // Validate dates
    if (!convertedStartDate || !convertedEndDate) {
      throw new BadRequestException('Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng DD/MM/YYYY');
    }

    // Validate date range
    const start = new Date(convertedStartDate);
    const end = new Date(convertedEndDate);
    if (start > end) {
      throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc');
    }

    const queryBuilder = this.locationAvailabilityRepository.createQueryBuilder('location_availability')
      .leftJoinAndSelect('location_availability.location', 'location')
      .leftJoinAndSelect('location_availability.workingDates', 'workingDates')
      .leftJoinAndSelect('location_availability.slotTimes', 'slotTimes')
      .where('workingDates.date BETWEEN :startDate AND :endDate', { 
        startDate: convertedStartDate,
        endDate: convertedEndDate
      });

    if (isAvailable !== undefined) {
      queryBuilder.andWhere('location_availability.isAvailable = :isAvailable', { isAvailable });
    }

    if (sortBy) {
      queryBuilder.orderBy(`location_availability.${sortBy}`, sortDirection === 'asc' ? 'ASC' : 'DESC');
    } else {
      queryBuilder.orderBy('location_availability.createdAt', sortDirection === 'asc' ? 'ASC' : 'DESC');
    }

    const [data, total] = await queryBuilder
      .skip((Number(current) - 1) * actualPageSize)
      .take(actualPageSize)
      .getManyAndCount();

    // Format dates and slot times in response
    const formattedData = await Promise.all(data.map(async availability => {
      // Get all slot time working dates for this availability
      const slotTimeWorkingDates = await this.locationSlotTimeWorkingDateRepository.find({
        where: {
          slotTimeId: In(availability.slotTimes.map(st => st.id)),
          workingDateId: In(availability.workingDates.map(wd => wd.id))
        },
        relations: ['slotTime', 'workingDate']
      });

      return {
        ...availability,
        workingDates: availability.workingDates?.map(workingDate => 
          this.formatLocationWorkingDates(workingDate)
        ),
        slotTimes: await this.formatSlotTimesArray(availability.slotTimes),
        slotTimeWorkingDates: await this.formatSlotTimeWorkingDatesArray(slotTimeWorkingDates)
      };
    }));

    return {
      data: formattedData,
      pagination: {
        current: Number(current),
        pageSize: actualPageSize,
        totalPage: Math.ceil(total / actualPageSize),
        totalItem: total,
      }
    };
  }

  async findByDate(date: string, query: FindLocationAvailabilityDto): Promise<{
    data: (LocationAvailability & { slotTimeWorkingDates: any[] })[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    }
  }> {
    if (!date) {
      throw new BadRequestException('Ngày không được để trống');
    }

    const { current, pageSize, sortBy, sortDirection, isAvailable } = query;
    const actualPageSize = Number(pageSize);

    // Convert date from DD/MM/YYYY to YYYY-MM-DD
    const convertedDate = this.convertDateFormat(date);
    if (!convertedDate) {
      throw new BadRequestException('Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng DD/MM/YYYY');
    }

    const queryBuilder = this.locationAvailabilityRepository.createQueryBuilder('location_availability')
      .leftJoinAndSelect('location_availability.location', 'location')
      .leftJoinAndSelect('location_availability.workingDates', 'workingDates')
      .leftJoinAndSelect('location_availability.slotTimes', 'slotTimes')
      .where('workingDates.date = :date', { date: convertedDate });

    if (isAvailable !== undefined) {
      queryBuilder.andWhere('location_availability.isAvailable = :isAvailable', { isAvailable });
    }

    if (sortBy) {
      queryBuilder.orderBy(`location_availability.${sortBy}`, sortDirection === 'asc' ? 'ASC' : 'DESC');
    } else {
      queryBuilder.orderBy('location_availability.createdAt', sortDirection === 'asc' ? 'ASC' : 'DESC');
    }

    const [data, total] = await queryBuilder
      .skip((Number(current) - 1) * actualPageSize)
      .take(actualPageSize)
      .getManyAndCount();

    // Format dates and slot times in response
    const formattedData = await Promise.all(data.map(async availability => {
      // Get all slot time working dates for this availability
      const slotTimeWorkingDates = await this.locationSlotTimeWorkingDateRepository.find({
        where: {
          slotTimeId: In(availability.slotTimes.map(st => st.id)),
          workingDateId: In(availability.workingDates.map(wd => wd.id))
        },
        relations: ['slotTime', 'workingDate']
      });

      return {
        ...availability,
        workingDates: availability.workingDates?.map(workingDate => 
          this.formatLocationWorkingDates(workingDate)
        ),
        slotTimes: await this.formatSlotTimesArray(availability.slotTimes),
        slotTimeWorkingDates: await this.formatSlotTimeWorkingDatesArray(slotTimeWorkingDates)
      };
    }));

    return {
      data: formattedData,
      pagination: {
        current: Number(current),
        pageSize: actualPageSize,
        totalPage: Math.ceil(total / actualPageSize),
        totalItem: total,
      }
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

  // update time only for saturday
  async updateTimeOnlyForDay(locationId: string, updateTimeOnlyForDayDto: UpdateTimeOnlyForDayDto): Promise<LocationAvailability> {
    // 1. Find the location
    const location = await this.locationRepository.findOne({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException('Vị trí không tồn tại');
    }

    // 2. Create new LocationAvailability for the specified day
    const newAvailability = this.locationAvailabilityRepository.create({
      startTime: updateTimeOnlyForDayDto.startTime,
      endTime: updateTimeOnlyForDayDto.endTime,
      isAvailable: true,
      location,
    });

    const savedAvailability = await this.locationAvailabilityRepository.save(newAvailability);

    // 3. Find all working dates that you want to update
    const workingDates = await this.locationWorkingDateRepository
      .createQueryBuilder('workingDate')
      .leftJoinAndSelect('workingDate.locationAvailability', 'locationAvailability')
      .where('locationAvailability.location_id = :locationId', { locationId })
      .getMany();

    // Map day names to their corresponding day numbers
    const dayToNumber = {
      [DayOfWeek.Monday]: 1,
      [DayOfWeek.Tuesday]: 2,
      [DayOfWeek.Wednesday]: 3,
      [DayOfWeek.Thursday]: 4,
      [DayOfWeek.Friday]: 5,
      [DayOfWeek.Saturday]: 6,
    };

    const workingDatesToUpdate = workingDates.filter(wd => {
      const date = new Date(wd.date);
      return date.getDay() === dayToNumber[updateTimeOnlyForDayDto.day];
    });

    // 4. Update working dates to point to new availability
    for (const workingDate of workingDatesToUpdate) {
      workingDate.locationAvailability = savedAvailability;
      await this.locationWorkingDateRepository.save(workingDate);
    }

    // 5. Create new slot times for the new availability
    const slotTimes: LocationSlotTime[] = [];
    const startTime = new Date(`2000-01-01T${updateTimeOnlyForDayDto.startTime}`);
    const endTime = new Date(`2000-01-01T${updateTimeOnlyForDayDto.endTime}`);
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
      slotTimes.push(savedSlotTime);
      currentTime = slotEndTime;
      slotNumber++;
    }

    // 6. Update existing slot time working date relationships
    for (const workingDate of workingDatesToUpdate) {
      // Find existing slot time working date relationships for this working date
      const existingRelationships = await this.locationSlotTimeWorkingDateRepository.find({
        where: { workingDateId: workingDate.id }
      });

      // Update each relationship with new slot time IDs
      for (let i = 0; i < existingRelationships.length; i++) {
        if (i < slotTimes.length) {
          // Update existing relationship with new slot time ID
          existingRelationships[i].slotTimeId = slotTimes[i].id;
          await this.locationSlotTimeWorkingDateRepository.save(existingRelationships[i]);
        } else {
          // Remove extra relationships if new slot times are fewer
          await this.locationSlotTimeWorkingDateRepository.remove(existingRelationships[i]);
        }
      }

      // Create new relationships if new slot times are more
      if (slotTimes.length > existingRelationships.length) {
        for (let i = existingRelationships.length; i < slotTimes.length; i++) {
          await this.locationSlotTimeWorkingDateRepository.save({
            slotTimeId: slotTimes[i].id,
            workingDateId: workingDate.id,
            maxParallelBookings: 1
          });
        }
      }
    }

    // 7. Return the updated availability with all related data
    return {
      ...savedAvailability,
      workingDates: workingDatesToUpdate.map(date => this.formatLocationWorkingDates(date)),
      slotTimes: await this.formatSlotTimesArray(slotTimes)
    };
  }

  // update working date status
  async updateWorkingDateStatus(workingDateId: string, updateLocationWorkingDateStatusDto: UpdateLocationWorkingDateStatusDto): Promise<LocationWorkingDate> {
    const workingDate = await this.locationWorkingDateRepository.findOne({
      where: { id: workingDateId },
    });
    
    if (!workingDate) {
      throw new NotFoundException('Ngày làm việc không tồn tại');
    }

    workingDate.isAvailable = updateLocationWorkingDateStatusDto.isAvailable;
    await this.locationWorkingDateRepository.save(workingDate);

    return this.formatLocationWorkingDates(workingDate);
  }

  // Lock slot for booking process
  async lockSlotForBooking(date: string, time: string, locationId: string): Promise<boolean> {
    try {
      // Convert date from DD/MM/YYYY to YYYY-MM-DD
      const convertedDate = this.convertDateFormat(date);
      if (!convertedDate) {
        throw new BadRequestException('Định dạng ngày không hợp lệ');
      }

      // Find the working date
      const workingDate = await this.locationWorkingDateRepository.findOne({
        where: {
          date: new Date(convertedDate),
          locationAvailability: {
            location: { id: locationId }
          }
        },
        relations: ['locationAvailability', 'locationAvailability.location']
      });

      if (!workingDate) {
        throw new NotFoundException('Không tìm thấy thông tin ngày làm việc cho vị trí này');
      }

      // Find the slot time for this time
      const slotTime = await this.locationSlotTimeRepository.findOne({
        where: {
          startSlotTime: time,
          locationAvailability: {
            location: { id: locationId }
          }
        },
        relations: ['locationAvailability', 'locationAvailability.location']
      });

      if (!slotTime) {
        throw new NotFoundException('Không tìm thấy thông tin slot time cho thời gian này');
      }

      // Find the slot time working date relationship
      const slotTimeWorkingDate = await this.locationSlotTimeWorkingDateRepository.findOne({
        where: {
          slotTimeId: slotTime.id,
          workingDateId: workingDate.id
        },
        relations: ['slotTime', 'workingDate']
      });

      if (!slotTimeWorkingDate) {
        throw new NotFoundException('Không tìm thấy thông tin slot time cho thời gian này trong ngày làm việc này');
      }

      // Use existing formatSlotTimeWorkingDates to get alreadyBooked count
      const formattedSlot = await this.formatSlotTimeWorkingDates(slotTimeWorkingDate);
      if (!formattedSlot) {
        return false;
      }

      // Check if slot is available
      if (formattedSlot.alreadyBooked >= slotTimeWorkingDate.maxParallelBookings) {
        return false; // Slot is not available
      }

      // Lock the slot by temporarily reducing maxParallelBookings
      slotTimeWorkingDate.maxParallelBookings = formattedSlot.alreadyBooked;
      await this.locationSlotTimeWorkingDateRepository.save(slotTimeWorkingDate);

      return true; // Slot locked successfully
    } catch (error) {
      this.logger.error(`Lỗi khóa slot: ${error.message}`);
      return false;
    }
  }

  // Unlock slot after timeout or payment
  async unlockSlot(date: string, time: string, locationId: string): Promise<void> {
    try {
      // Convert date from DD/MM/YYYY to YYYY-MM-DD
      const convertedDate = this.convertDateFormat(date);
      if (!convertedDate) {
        throw new BadRequestException('Định dạng ngày không hợp lệ');
      }

      // Find the working date
      const workingDate = await this.locationWorkingDateRepository.findOne({
        where: {
          date: new Date(convertedDate),
          locationAvailability: {
            location: { id: locationId }
          }
        },
        relations: ['locationAvailability', 'locationAvailability.location']
      });

      if (!workingDate) {
        this.logger.warn('Thông tin ngày làm việc cho vị trí này không tồn tại');
        return;
      }

      // Find the slot time for this time
      const slotTime = await this.locationSlotTimeRepository.findOne({
        where: {
          startSlotTime: time,
          locationAvailability: {
            location: { id: locationId }
          }
        },
        relations: ['locationAvailability', 'locationAvailability.location']
      });

      if (!slotTime) {
        this.logger.warn('Thông tin slot time cho thời gian này không tồn tại');
        return;
      }

      // Find the slot time working date relationship
      const slotTimeWorkingDate = await this.locationSlotTimeWorkingDateRepository.findOne({
        where: {
          slotTimeId: slotTime.id,
          workingDateId: workingDate.id
        }
      });

      if (!slotTimeWorkingDate) {
        this.logger.warn('Thông tin slot time cho ngày này không tồn tại');
        return;
      }

      // Restore original maxParallelBookings (assuming it was 1 before locking)
      slotTimeWorkingDate.maxParallelBookings = 1;
      await this.locationSlotTimeWorkingDateRepository.save(slotTimeWorkingDate);

      this.logger.log(`Slot mở ra cho ngày: ${date}, thời gian: ${time}, vị trí: ${locationId}`);
    } catch (error) {
      this.logger.error(`Lỗi mở slot: ${error.message}`);
    }
  }

  // Check if slot is available for booking
  async isSlotAvailableForBooking(date: string, time: string, locationId: string): Promise<boolean> {
    try {
      // Convert date from DD/MM/YYYY to YYYY-MM-DD
      const convertedDate = this.convertDateFormat(date);
      if (!convertedDate) {
        return false;
      }

      // Find the working date
      const workingDate = await this.locationWorkingDateRepository.findOne({
        where: {
          date: new Date(convertedDate),
          locationAvailability: {
            location: { id: locationId }
          }
        },
        relations: ['locationAvailability', 'locationAvailability.location']
      });

      if (!workingDate || !workingDate.isAvailable) {
        return false;
      }

      // Find the slot time for this time
      const slotTime = await this.locationSlotTimeRepository.findOne({
        where: {
          startSlotTime: time,
          locationAvailability: {
            location: { id: locationId }
          }
        },
        relations: ['locationAvailability', 'locationAvailability.location']
      });

      if (!slotTime) {
        return false;
      }

      // Find the slot time working date relationship
      const slotTimeWorkingDate = await this.locationSlotTimeWorkingDateRepository.findOne({
        where: {
          slotTimeId: slotTime.id,
          workingDateId: workingDate.id
        },
        relations: ['slotTime', 'workingDate']
      });

      if (!slotTimeWorkingDate) {
        return false;
      }

      // Use existing formatSlotTimeWorkingDates to get availability info
      const formattedSlot = await this.formatSlotTimeWorkingDates(slotTimeWorkingDate);
      if (!formattedSlot) {
        return false;
      }

      // Check if slot has available capacity
      return formattedSlot.isAvailable;
    } catch (error) {
      this.logger.error(`Lỗi kiểm tra tính khả dụng của slot: ${error.message}`);
      return false;
    }
  }
}