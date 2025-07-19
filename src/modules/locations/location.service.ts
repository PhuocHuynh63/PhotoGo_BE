import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between, In } from 'typeorm';
import { Location } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { FindLocationDto } from './dto/find-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Vendor } from '../vendors/entities/vendor.entity';
import { Not } from 'typeorm';
import { SearchLocationDto } from './dto/search-location.dto';
import { VendorStatus } from 'src/constants/vendor.enum';
import { DataSource } from 'typeorm';
import { PaginationDto } from './dto/pagination.dto';
import { GetCitiesDto } from './dto/get-cities.dto';
import { GoongService } from 'src/3rdService/goong/goong.service';
import { LocationSlotBookingsResponseDto, SlotBookingsDto, SlotBookingDetailDto } from './dto/location-slot-bookings.dto';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingStatus } from 'src/constants/booking.enum';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly dataSource: DataSource,
    private readonly goongService: GoongService,
  ) { }

  //#region create
  async create(vendor_id: string, createLocationDto: CreateLocationDto): Promise<Location> {
    // Validate required fields
    if (!vendor_id) {
      throw new BadRequestException('ID vendor không được để trống');
    }
    if (!createLocationDto.address) {
      throw new BadRequestException('Địa chỉ không được để trống');
    }

    // Check if vendor exists
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendor_id }
    });
    if (!vendor) {
      throw new NotFoundException(`Không tìm thấy vendor với ID ${vendor_id}`);
    }

    // Check if vendor already has a location with the same address
    const existingLocation = await this.locationRepository.findOne({
      where: {
        vendor: { id: vendor_id },
        address: createLocationDto.address,
        city: createLocationDto.city,
        province: createLocationDto.province
      }
    });
    if (existingLocation) {
      throw new ConflictException('Vendor đã có địa điểm này');
    }

    // Process location with geocoding if coordinates are not provided
    let processedLocation = { ...createLocationDto };

    // If coordinates are already provided, use them
    if (createLocationDto.latitude !== undefined && createLocationDto.longitude !== undefined) {
      // Validate provided coordinates
      if (createLocationDto.latitude < -90 || createLocationDto.latitude > 90) {
        throw new BadRequestException('Latitude phải nằm trong khoảng từ -90 đến 90 độ');
      }
      if (createLocationDto.longitude < -180 || createLocationDto.longitude > 180) {
        throw new BadRequestException('Longitude phải nằm trong khoảng từ -180 đến 180 độ');
      }
    } else if (createLocationDto.autoGeocode !== false) {
      // Try to get coordinates from GoongAPI using complete address function
      try {
        const completeAddressResult = await this.goongService.getCompleteAddressFromInput(
          createLocationDto.address,
          createLocationDto.district,
          createLocationDto.ward,
          createLocationDto.city,
          createLocationDto.province
        );

        if (completeAddressResult && completeAddressResult.latitude && completeAddressResult.longitude) {
          processedLocation.latitude = completeAddressResult.latitude;
          processedLocation.longitude = completeAddressResult.longitude;
        }
      } catch (error) {
        // If geocoding fails, continue without coordinates
        console.warn(`Failed to get complete address: ${createLocationDto.address}. Error: ${error.message}`);
      }
    }

    const location = this.locationRepository.create({
      ...processedLocation,
      vendor,
    });

    const savedLocation = await this.locationRepository.save(location);

    // Tạo vendor-album cho location nếu chưa có
    const vendorAlbumRepo = this.locationRepository.manager.getRepository('VendorAlbum');
    let vendorAlbum = await vendorAlbumRepo.findOne({ where: { location: { id: savedLocation.id } } });
    if (!vendorAlbum) {
      vendorAlbum = vendorAlbumRepo.create({ location: savedLocation });
      await vendorAlbumRepo.save(vendorAlbum);
    }

    return savedLocation;
  }
  //#endregion create

  /**
   * Take a vendor ID and return all locations associated with that vendor.
   * @param vendor_id 
   * @returns 
   */
  async findByVendorId(vendor_id: string, status?: VendorStatus): Promise<Location[]> {
    if (!vendor_id) {
      throw new BadRequestException('ID vendor không được để trống');
    }

    const whereCondition: any = { id: vendor_id };
    if (status) {
      if (!Object.values(VendorStatus).includes(status)) {
        throw new BadRequestException('Trạng thái vendor không hợp lệ');
      }
      whereCondition.status = status;
    }

    const vendor = await this.vendorRepository.findOne({
      where: whereCondition,
      relations: ['locations'],
    });
    if (!vendor) {
      throw new NotFoundException(`Không tìm thấy vendor với ID ${vendor_id}`);
    }
    return vendor.locations;
  }
  //----------------------End----------------------//

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

    // Process location with geocoding if coordinates are not provided
    let processedLocation = { ...updateLocationDto };

    // If coordinates are already provided, use them
    if (updateLocationDto.latitude !== undefined && updateLocationDto.longitude !== undefined) {
      // Validate provided coordinates
      if (updateLocationDto.latitude < -90 || updateLocationDto.latitude > 90) {
        throw new BadRequestException('Latitude phải nằm trong khoảng từ -90 đến 90 độ');
      }
      if (updateLocationDto.longitude < -180 || updateLocationDto.longitude > 180) {
        throw new BadRequestException('Longitude phải nằm trong khoảng từ -180 đến 180 độ');
      }
    } else if (updateLocationDto.autoGeocode !== false && (updateLocationDto.address || updateLocationDto.district || updateLocationDto.ward || updateLocationDto.city || updateLocationDto.province)) {
      // Try to get coordinates from GoongAPI using complete address function if address components are being updated
      try {
        const completeAddressResult = await this.goongService.getCompleteAddressFromInput(
          updateLocationDto.address || location.address,
          updateLocationDto.district || location.district,
          updateLocationDto.ward || location.ward,
          updateLocationDto.city || location.city,
          updateLocationDto.province || location.province
        );

        if (completeAddressResult && completeAddressResult.latitude && completeAddressResult.longitude) {
          processedLocation.latitude = completeAddressResult.latitude;
          processedLocation.longitude = completeAddressResult.longitude;
        }
      } catch (error) {
        // If geocoding fails, continue without coordinates
        console.warn(`Failed to get complete address: ${updateLocationDto.address || location.address}. Error: ${error.message}`);
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

    Object.assign(location, processedLocation);
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

  //#region getUserLocation
  async getUserLocation(vendor_id: string, latitude: number, longitude: number, paginationDto: PaginationDto) {
    const { current, pageSize, sortBy, sortDirection } = paginationDto;

    const currentPage = current ? Number(current) : 1;
    const limit = pageSize ? Number(pageSize) : 10;
    const skip = (currentPage - 1) * limit;

    // Check if vendor exists and has locations
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendor_id, status: VendorStatus.ACTIVE },
      relations: ['locations']
    });

    if (!vendor) {
      throw new NotFoundException(`Không tìm thấy vendor với ID ${vendor_id}`);
    }

    if (!vendor.locations || vendor.locations.length === 0) {
      return {
        data: [],
        pagination: {
          current: currentPage,
          pageSize: limit,
          totalPage: 0,
          totalItem: 0
        }
      };
    }

    // Query to get total count of locations for this vendor
    const countQuery = `
      SELECT COUNT(*) as total
      FROM locations l
      WHERE l.vendor_id = $1
      AND l.latitude IS NOT NULL 
      AND l.longitude IS NOT NULL
    `;

    // Main query to get locations with distance calculation
    const query = `
      WITH vendor_locations AS (
        SELECT 
          v.id as vendor_id,
          v.name as vendor_name,
          v.logo as vendor_logo,
          l.id as location_id,
          l.address,
          l.district,
          l.ward,
          l.city,
          l.province,
          l.latitude,
          l.longitude,
          (
            6371 * acos(
              cos(radians($2)) * 
              cos(radians(l.latitude)) * 
              cos(radians(l.longitude) - radians($3)) + 
              sin(radians($2)) * 
              sin(radians(l.latitude))
            )
          ) as distance
        FROM vendors v
        JOIN locations l ON l.vendor_id = v.id
        WHERE v.id = $1
        AND v.status = 'hoạt động'
        AND l.latitude IS NOT NULL 
        AND l.longitude IS NOT NULL
      )
      SELECT 
        vendor_id,
        vendor_name,
        vendor_logo,
        location_id,
        address,
        district,
        ward,
        city,
        province,
        latitude,
        longitude,
        ROUND(distance::numeric, 2) as distance
      FROM vendor_locations
      ORDER BY distance ${sortDirection === 'desc' ? 'DESC' : 'ASC'}
      LIMIT $4 OFFSET $5
    `;

    // Execute both queries
    const [locations, totalResult] = await Promise.all([
      this.dataSource.query(query, [vendor_id, latitude, longitude, limit, skip]),
      this.dataSource.query(countQuery, [vendor_id])
    ]);

    const totalItem = Number(totalResult[0].total);
    const totalPage = Math.ceil(totalItem / limit);

    return {
      data: locations.map(loc => ({
        vendor: {
          id: loc.vendor_id,
          name: loc.vendor_name,
          logo: loc.vendor_logo
        },
        location: {
          id: loc.location_id,
          address: loc.address,
          district: loc.district,
          ward: loc.ward,
          city: loc.city,
          province: loc.province,
          latitude: loc.latitude,
          longitude: loc.longitude
        },
        distance: loc.distance // Khoảng cách tính bằng km
      })),
      pagination: {
        current: currentPage,
        pageSize: limit,
        totalPage,
        totalItem
      }
    };
  }
  //#endregion getUserLocation

  //#region getAllCities
  async getAllCities(getCitiesDto: GetCitiesDto): Promise<{
    data: string[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    try {
      const { current, pageSize, sortDirection, filterField } = getCitiesDto;

      const currentPage = current ? Number(current) : 1;
      const limit = pageSize ? Number(pageSize) : 10;
      const skip = (currentPage - 1) * limit;

      // Validate pagination parameters
      if (currentPage < 1) {
        throw new BadRequestException('Trang hiện tại phải lớn hơn 0');
      }
      if (limit < 1 || limit > 100) {
        throw new BadRequestException('Số lượng item trên trang phải từ 1 đến 100');
      }

      // Validate filter field
      const allowedFilterFields = ['city', 'ward', 'district', 'province'];
      const fieldToFilter = allowedFilterFields.includes(filterField) ? filterField : 'city';

      // Get total count
      const totalResult = await this.locationRepository
        .createQueryBuilder('location')
        .select(`COUNT(DISTINCT location.${fieldToFilter})`, 'total')
        .where(`location.${fieldToFilter} IS NOT NULL`)
        .andWhere(`location.${fieldToFilter} != :emptyString`, { emptyString: '' })
        .getRawOne();

      const totalItem = Number(totalResult.total);

      // Get filtered data with pagination
      const results = await this.locationRepository
        .createQueryBuilder('location')
        .select(`DISTINCT location.${fieldToFilter}`, fieldToFilter)
        .where(`location.${fieldToFilter} IS NOT NULL`)
        .andWhere(`location.${fieldToFilter} != :emptyString`, { emptyString: '' })
        .orderBy(`location.${fieldToFilter}`, sortDirection === 'desc' ? 'DESC' : 'ASC')
        .limit(limit)
        .offset(skip)
        .getRawMany();

      const totalPage = Math.ceil(totalItem / limit);

      return {
        data: results.map((result) => result[fieldToFilter]),
        pagination: {
          current: currentPage,
          pageSize: limit,
          totalPage,
          totalItem,
        },
      };
    } catch (error) {
      throw new BadRequestException('Không thể lấy danh sách: ' + error.message);
    }
  }
  //#endregion getAllCities

  //#region testGoongAPI
  async testGoongAPI() {
    try {
      // Test 1: API Key Validation
      const isValid = await this.goongService.validateApiKey();

      // Test 2: Complete Address from Input
      const completeAddressResult = await this.goongService.getCompleteAddressFromInput(
        '123 Đường ABC',
        'Quận 1',
        'Phường Bến Nghé',
        'TP. Hồ Chí Minh',
        'Việt Nam'
      );

      // Test 3: Complete Address from Coordinates
      const reverseResult = await this.goongService.getCompleteAddressFromCoordinates(
        10.762622,
        106.660172
      );

      // Test 4: Demo Complete Address
      await this.goongService.demoCompleteAddress();

      return {
        apiKeyValid: isValid,
        completeAddressFromInput: completeAddressResult,
        completeAddressFromCoordinates: reverseResult,
        message: 'All tests completed. Check logs for demo details.'
      };
    } catch (error) {
      throw new Error(`GoongAPI test failed: ${error.message}`);
    }
  }
  //#endregion testGoongAPI

  // async getSlotBookings(locationId: string, from: string, to: string): Promise<LocationSlotBookingsResponseDto> {
  //   function parseDDMMYYYY(dateStr: string): Date {
  //     const [day, month, year] = dateStr.split('/');
  //     return new Date(`${year}-${month}-${day}`);
  //   }

  //   const fromDate = parseDDMMYYYY(from);
  //   const toDate = parseDDMMYYYY(to);

  //   // Lấy tất cả booking của location này trong khoảng ngày
  //   // (giả sử booking có trường date, time, status, user, serviceConcept, notes, phone, email)
  //   const bookings = await this.bookingRepository.find({
  //     where: {
  //       locationId,
  //       date: Between(fromDate, toDate),
  //     },
  //     relations: ['user', 'serviceConcept'],
  //     order: { date: 'ASC', time: 'ASC' }
  //   });

  //   // Gom nhóm theo date + time (slot)
  //   const slotMap = new Map<string, SlotBookingsDto>();
  //   for (const booking of bookings) {
  //     const slotKey = `${booking.date.toISOString().slice(0, 10)}_${booking.time}`;
  //     if (!slotMap.has(slotKey)) {
  //       slotMap.set(slotKey, {
  //         date: booking.date.toISOString().slice(0, 10),
  //         time: booking.time,
  //         count: 0,
  //         bookings: []
  //       });
  //     }
  //     const slot = slotMap.get(slotKey)!;
  //     slot.count++;
  //     slot.bookings.push({
  //       id: booking.id,
  //       fullName: booking.user?.fullName || '',
  //       status: booking.status,
  //       service: booking.serviceConcept?.name || '',
  //       notes: booking.userNote,
  //       phone: booking.phone,
  //       email: booking.email
  //     });
  //   }
  //   return { slots: Array.from(slotMap.values()) };
  // }

  async getLocationScheduleOverview(locationId: string, from: string, to: string): Promise<{
    slots: SlotBookingsDto[];
    stats: {
      total: number;
      confirmed: number;
      pending: number;
      expectedRevenue: number;
    };
    todayBookings: SlotBookingDetailDto[];
  }> {
    function parseDDMMYYYY(dateStr: string): Date {
      const [day, month, year] = dateStr.split('/');
      return new Date(`${year}-${month}-${day}`);
    }

    const fromDate = parseDDMMYYYY(from);
    const toDate = parseDDMMYYYY(to);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Lấy tất cả booking của location này trong khoảng ngày
    // (giả sử booking có trường date, time, status, user, serviceConcept, notes, phone, email)
    const bookings = await this.bookingRepository.find({
      where: {
        locationId,
        date: Between(fromDate, toDate),
        status: In([BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.PROGRESSING, BookingStatus.COMPLETED]),
      },
      relations: ['user', 'serviceConcept', 'invoices', 'schedules'],
      order: { date: 'ASC', time: 'ASC' }
    });

    // Gom nhóm theo date + time (slot)
    const slotMap = new Map<string, SlotBookingsDto>();
    let total = 0;
    let confirmed = 0;
    let pending = 0;
    let expectedRevenue = 0;
    const todayBookings: SlotBookingDetailDto[] = [];

    for (const booking of bookings) {
      const dateObj = booking.date instanceof Date ? booking.date : new Date(booking.date);
      const bookingDetail: SlotBookingDetailDto = {
        id: booking.id,
        fullName: booking.user?.fullName || '',
        status: booking.status,
        service: booking.serviceConcept?.name || '',
        notes: booking.userNote,
        phone: booking.phone,
        email: booking.email,
        alreadyPaid: booking.invoices && booking.invoices.length > 0 ? booking.invoices[0].paidAmount : 0,
        remain: booking.invoices && booking.invoices.length > 0 ? booking.invoices[0].payablePrice - booking.invoices[0].paidAmount : 0,
        total: booking.invoices && booking.invoices.length > 0 ? booking.invoices[0].payablePrice : 0
      };
      if (booking.time) {
        // booking 1 ngày
        let from: string | null = booking.time;
        let to: string | null = null;
        const duration = booking.serviceConcept?.duration;
        if (duration && typeof duration === 'number') {
          const [hour, minute] = booking.time.split(':').map(Number);
          const fromDateTime = new Date(dateObj);
          fromDateTime.setHours(hour, minute, 0, 0);
          const toDateTime = new Date(fromDateTime.getTime() + duration * 60000);
          to = toDateTime.toTimeString().slice(0, 8);
        } else {
          to = from;
        }
        const slotKey = `${dateObj.toISOString().slice(0, 10)}_${from}`;
        if (!slotMap.has(slotKey)) {
          slotMap.set(slotKey, {
            date: dateObj.toISOString().slice(0, 10),
            from,
            to,
            count: 0,
            bookings: []
          });
        }
        const slot = slotMap.get(slotKey)!;
        // Cập nhật to = max (so sánh chuỗi HH:mm:ss)
        if (slot.to === null || (to && to > slot.to)) {
          slot.to = to;
        }
        slot.count++;
        slot.bookings.push(bookingDetail);
        // Lịch hôm nay
        if (dateObj.toISOString().slice(0, 10) === todayStr) {
          todayBookings.push(bookingDetail);
        }
      } else if (booking.schedules && booking.schedules.length > 0) {
        // booking nhiều ngày
        for (const schedule of booking.schedules) {
          const scheduleDate = schedule.date instanceof Date ? schedule.date : new Date(schedule.date);
          const slotKey = `${scheduleDate.toISOString().slice(0, 10)}_null`;
          if (!slotMap.has(slotKey)) {
            slotMap.set(slotKey, {
              date: scheduleDate.toISOString().slice(0, 10),
              from: null,
              to: null,
              count: 0,
              bookings: []
            });
          }
          const slot = slotMap.get(slotKey)!;
          slot.count++;
          slot.bookings.push(bookingDetail);
          // Lịch hôm nay
          if (scheduleDate.toISOString().slice(0, 10) === todayStr) {
            todayBookings.push(bookingDetail);
          }
        }
      }
      // Thống kê
      total++;
      if (booking.status === BookingStatus.CONFIRMED) confirmed++;
      if (booking.status === BookingStatus.PENDING) pending++;
      if (booking.invoices && booking.invoices.length > 0 && typeof booking.invoices[0].payablePrice === 'number') expectedRevenue += Number(booking.invoices[0].payablePrice);
    }
    return {
      slots: Array.from(slotMap.values()),
      stats: {
        total,
        confirmed,
        pending,
        expectedRevenue
      },
      todayBookings
    };
  }
}