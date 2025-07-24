import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Logger,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { LocationAvailabilityService } from './location-availability.service';
import { CreateLocationTimeScheduleDto } from './dto/create-location-time-schedule.dto';
import { CreateLocationSlotTimeDto } from './dto/create-location-slot-time.dto';
import { UpdateLocationAvailabilityDto } from './dto/update-location-availability.dto';
import { UpdateTimeOnlyForDayDto } from './dto/update-time-only-for-saturday.dto';
import { LocationAvailability } from './entities/location-availability.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { Public } from 'src/decorator/custom';
import { FindLocationAvailabilityDto, FindLocationAvailabilityWithDateDto } from './dto/find-location.dto';
import { LocationSlotTime } from './entities/location-slot-time.entity';
import { UpdateLocationSlotTimeDto } from './dto/update-location-slot-time.dto';
import { LocationWorkingDate } from './entities/location-workingdate.entity';
import { CreateLocationWorkingDateDto } from './dto/create-location-working-date.dto';
import { FindLocationDateRangeDto } from './dto/find-location.dto';
import { UpdateLocationWorkingDateStatusDto } from './dto/update-location-working-date.dto';

@ApiTags('Location Availability')
@Controller('location-availability')
@ApiBearerAuth('access-token')
export class LocationAvailabilityController {
  private readonly logger = new Logger(LocationAvailabilityController.name);

  constructor(private readonly locationAvailabilityService: LocationAvailabilityService) {}

  // Static endpoints
  @Get()
  @Public()
  @ApiOperation({ summary: 'Lấy tất cả thời gian làm việc' })
  @ApiResponse({ status: 200, description: 'Trả về tất cả thời gian làm việc' })
  async findAll(@Query() query: FindLocationAvailabilityDto): Promise<{
    data: LocationAvailability[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    }
  }> {
    try {
      return await this.locationAvailabilityService.findAll(query);
    } catch (error) {
      this.logger.error(`Lỗi tìm kiếm thời gian làm việc: ${error.message}`);
      throw new HttpException('Lỗi tìm kiếm thời gian làm việc', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('date-range')
  @Public()
  @ApiOperation({ summary: 'Lấy thời gian làm việc theo khoảng thời gian' })
  @ApiResponse({ status: 200, description: 'Trả về thời gian làm việc theo khoảng thời gian' })
  async findByDateRange(
    @Query() query: FindLocationDateRangeDto
  ): Promise<{
    data: LocationAvailability[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    }
  }> {
    if (new Date(query.endDate) < new Date(query.startDate)) {
      throw new HttpException('Ngày kết thúc phải lớn hơn ngày bắt đầu', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.locationAvailabilityService.findByDateRange(query.startDate, query.endDate, query);
    } catch (error) {
      this.logger.error(`Lỗi tìm kiếm thời gian làm việc: ${error.message}`);
      throw new HttpException('Lỗi tìm kiếm thời gian làm việc', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('date/:date')
  @Public()
  @ApiOperation({ summary: 'Lấy thời gian làm việc theo ngày' })
  @ApiResponse({ status: 200, description: 'Trả về thời gian làm việc theo ngày' })
  async findByDate(@Param('date') date: string, @Query() query: FindLocationAvailabilityDto): Promise<{
    data: LocationAvailability[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    }
  }> {
    try {
      if (!date) {
        throw new BadRequestException('Ngày không được để trống');
      }

      // Validate date format
      const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      if (!dateRegex.test(date)) {
        throw new BadRequestException('Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng DD/MM/YYYY');
      }

      // Validate date values
      const [day, month, year] = date.split('/');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (dateObj.getFullYear() !== parseInt(year) || 
          dateObj.getMonth() !== parseInt(month) - 1 || 
          dateObj.getDate() !== parseInt(day)) {
        throw new BadRequestException('Ngày không hợp lệ');
      }

      return await this.locationAvailabilityService.findByDate(date, query);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Lỗi tìm kiếm thời gian làm việc: ${error.message}`);
      throw new HttpException('Lỗi tìm kiếm thời gian làm việc', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('location/:locationId')
  @Public()
  @ApiOperation({ summary: 'Lấy thời gian làm việc theo ID vị trí' })
  @ApiResponse({ status: 200, description: 'Trả về thời gian làm việc theo ID vị trí' })
  async findByLocationId(@Param('locationId') locationId: string, @Query() query: FindLocationAvailabilityDto): Promise<{
    data: LocationAvailability[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    }
  }> {
    try {
      if (!isUUID(locationId)) {
        throw new HttpException('ID vị trí không hợp lệ', HttpStatus.BAD_REQUEST);
      }
      return await this.locationAvailabilityService.findByLocationId(locationId, query);
    } catch (error) {
      this.logger.error(`Lỗi tìm kiếm thời gian làm việc: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi tìm kiếm thời gian làm việc', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  //test lock slot booking
  @Post('test-lock-slot-booking')
  @ApiOperation({ summary: 'Test lock slot booking' })
  @ApiResponse({ status: 200, description: 'Test lock slot booking' })
  async testLockSlotBooking(@Body() body: { date: string, time: string, locationId: string }): Promise<boolean> {
    return await this.locationAvailabilityService.lockSlotForBooking(body.date = '26/07/2025', body.time = '12:00', body.locationId = '13f89bc4-66eb-480e-8618-53013f4b5594');
  }

  @Get('location/:locationId/multi-day')
  @Public()
  @ApiOperation({ summary: 'Lấy thời gian làm việc cho multi-day booking theo ID vị trí' })
  @ApiResponse({ status: 200, description: 'Trả về thời gian làm việc cho multi-day booking, kiểm tra availability theo ngày (không theo slot time)' })
  async findByLocationIdForMultiDay(@Param('locationId') locationId: string, @Query() query: FindLocationAvailabilityDto): Promise<{
    data: LocationAvailability[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    }
  }> {
    try { 
      if (!isUUID(locationId)) {
        throw new HttpException('ID vị trí không hợp lệ', HttpStatus.BAD_REQUEST);
      }
      return await this.locationAvailabilityService.findByLocationIdForMultiDay(locationId, query);
    } catch (error) {
      this.logger.error(`Lỗi tìm kiếm thời gian làm việc: ${error.message}`);
      if (error instanceof HttpException) { 
        throw error;
      }
      throw new HttpException('Lỗi tìm kiếm thời gian làm việc', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('location/:locationId/date')
  @Public()
  @ApiOperation({ summary: 'Lấy thời gian làm việc theo ID vị trí và ngày' })
  @ApiResponse({ status: 200, description: 'Trả về thời gian làm việc theo ID vị trí và ngày' })
  async findByLocationIdAndDate(@Param('locationId') locationId: string, @Query() query: FindLocationAvailabilityWithDateDto): Promise<{
    data: LocationAvailability[];
  }> {
    try {
      if (!isUUID(locationId)) {
        throw new HttpException('ID vị trí không hợp lệ', HttpStatus.BAD_REQUEST);
      }
      return await this.locationAvailabilityService.findByLocationIdAndDate(locationId, query);
    } catch (error) {
      this.logger.error(`Lỗi tìm kiếm thời gian làm việc: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi tìm kiếm thời gian làm việc', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Dynamic endpoints
  @Post(':locationId')
  @ApiOperation({ summary: 'Tạo thời gian làm việc' })
  @ApiResponse({ status: 201, description: 'Thời gian làm việc đã được tạo thành công' })
  async create(@Param('locationId') locationId: string, @Body() createLocationTimeScheduleDto: CreateLocationTimeScheduleDto): Promise<LocationAvailability> {
    try {
      return await this.locationAvailabilityService.create(locationId, createLocationTimeScheduleDto);
    } catch (error) {
      this.logger.error(`Lỗi tạo thời gian làm việc: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi tạo thời gian làm việc', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  

  @Patch(':locationId/update-time-only-for-day')
  @ApiOperation({ summary: 'Đồng bộ thời gian làm việc cho thứ cụ thể' })
  @ApiResponse({ status: 200, description: 'Thời gian làm việc đã được cập nhật thành công' })
  async updateTimeOnlyForDay(@Param('locationId') locationId: string, @Body() updateTimeOnlyForDayDto: UpdateTimeOnlyForDayDto): Promise<LocationAvailability> {
    try {
      if (!isUUID(locationId)) {
        throw new HttpException('ID không hợp lệ', HttpStatus.BAD_REQUEST);
      }
      return await this.locationAvailabilityService.updateTimeOnlyForDay(locationId, updateTimeOnlyForDayDto);
    } catch (error) {
      this.logger.error(`Lỗi cập nhật thời gian làm việc: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi cập nhật thời gian làm việc', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(':workingDateId/slot-time/:slotTimeId')
  @ApiOperation({ summary: 'Cập nhật slot time' })
  @ApiResponse({ status: 200, description: 'Slot time đã được cập nhật thành công' })
  async updateSlotTime(@Param('workingDateId') workingDateId: string, @Param('slotTimeId') slotTimeId: string, @Body() updateLocationSlotTimeDto: UpdateLocationSlotTimeDto): Promise<LocationSlotTime> {
    try {
      if (!isUUID(workingDateId) || !isUUID(slotTimeId)) {
        throw new HttpException('ID không hợp lệ', HttpStatus.BAD_REQUEST);
      }
      return await this.locationAvailabilityService.updateSlot(workingDateId, slotTimeId, updateLocationSlotTimeDto);
    } catch (error) {
      this.logger.error(`Lỗi cập nhật thời gian làm việc: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi cập nhật thời gian làm việc', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(':workingDateId/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái ngày làm việc' })
  @ApiResponse({ status: 200, description: 'Trạng thái ngày làm việc đã được cập nhật thành công' })
  async updateWorkingDateStatus(
    @Param('workingDateId') workingDateId: string, 
    @Body() updateLocationWorkingDateStatusDto: UpdateLocationWorkingDateStatusDto
  ): Promise<LocationWorkingDate> {
    try {
      if (!isUUID(workingDateId)) {
        throw new HttpException('ID không hợp lệ', HttpStatus.BAD_REQUEST);
      }
      return await this.locationAvailabilityService.updateWorkingDateStatus(workingDateId, updateLocationWorkingDateStatusDto);
    } catch (error) {
      this.logger.error(`Lỗi cập nhật trạng thái ngày làm việc: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi cập nhật trạng thái ngày làm việc', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa thời gian làm việc' })
  @ApiResponse({ status: 200, description: 'Thời gian làm việc đã được xóa thành công' })
  async remove(@Param('id') id: string): Promise<void> {
    try {
      if (!isUUID(id)) {
        throw new HttpException('ID không hợp lệ', HttpStatus.BAD_REQUEST);
      }
      await this.locationAvailabilityService.remove(id);
    } catch (error) {
      this.logger.error(`Lỗi xóa thời gian làm việc: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi xóa thời gian làm việc', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Slot time endpoints
  @Get(':locationAvailabilityId/slot-time')
  @ApiOperation({ summary: 'Lấy danh sách slot time' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách slot time' })
  async getSlotTime(@Param('locationAvailabilityId') locationAvailabilityId: string): Promise<LocationSlotTime[]> {
    try {
      if (!isUUID(locationAvailabilityId)) {
        throw new HttpException('ID không hợp lệ', HttpStatus.BAD_REQUEST);
      }
      return await this.locationAvailabilityService.getSlotTime(locationAvailabilityId);
    } catch (error) {
      this.logger.error(`Lỗi lấy thời gian làm việc: ${error.message}`);
      throw new HttpException('Lỗi lấy thời gian làm việc', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':locationAvailabilityId/slot-time')
  @ApiOperation({ summary: 'Tạo slot time' })
  @ApiResponse({ status: 201, description: 'Slot time đã được tạo thành công' })
  async createSlotTime(@Param('locationAvailabilityId') locationAvailabilityId: string, @Body() createLocationSlotTimeDto: CreateLocationSlotTimeDto): Promise<LocationSlotTime[]> {
    try {
      if (!isUUID(locationAvailabilityId)) {
        throw new HttpException('ID không hợp lệ', HttpStatus.BAD_REQUEST);
      }
      return await this.locationAvailabilityService.createSlotTime(locationAvailabilityId, createLocationSlotTimeDto);
    } catch (error) {
      this.logger.error(`Lỗi tạo thời gian làm việc: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi tạo thời gian làm việc', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':locationAvailabilityId/slot-time/:slotTimeId')
  @ApiOperation({ summary: 'Xóa slot time' })
  @ApiResponse({ status: 200, description: 'Slot time đã được xóa thành công' })
  async deleteSlotTime(@Param('locationAvailabilityId') locationAvailabilityId: string, @Param('slotTimeId') slotTimeId: string): Promise<void> {
    try {
      if (!isUUID(locationAvailabilityId) || !isUUID(slotTimeId)) {
        throw new HttpException('ID không hợp lệ', HttpStatus.BAD_REQUEST);
      }
      return await this.locationAvailabilityService.deleteSlotTime(locationAvailabilityId, slotTimeId);
    } catch (error) {
      this.logger.error(`Lỗi xóa thời gian làm việc: ${error.message}`);
      throw new HttpException('Lỗi xóa thời gian làm việc', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // create location working date
  @Post(':locationAvailabilityId/working-date')
  @ApiOperation({ summary: 'Tạo ngày làm việc trên khung giờ có sẵn' })
  @ApiResponse({ status: 201, description: 'Ngày làm việc đã được tạo thành công' })
  async createWorkingDate(@Param('locationAvailabilityId') locationAvailabilityId: string, @Body() createLocationWorkingDateDto: CreateLocationWorkingDateDto): Promise<LocationWorkingDate> {
    try {
      if (!isUUID(locationAvailabilityId)) {
        throw new HttpException('ID không hợp lệ', HttpStatus.BAD_REQUEST);
      }
      return await this.locationAvailabilityService.createWorkingDate(locationAvailabilityId, createLocationWorkingDateDto);
    } catch (error) {
      this.logger.error(`Lỗi tạo ngày làm việc: ${error.message}`);
      throw new HttpException('Lỗi tạo ngày làm việc', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Lấy thời gian làm việc theo ID' })
  @ApiResponse({ status: 200, description: 'Trả về thời gian làm việc theo ID' })
  async findOne(@Param('id') id: string): Promise<LocationAvailability> {
    try {
      if (!isUUID(id)) {
        throw new HttpException('ID không hợp lệ', HttpStatus.BAD_REQUEST);
      }
      return await this.locationAvailabilityService.findOne(id);
    } catch (error) {
      this.logger.error(`Lỗi tìm kiếm thời gian làm việc: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi tìm kiếm thời gian làm việc', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thời gian làm việc' })
  @ApiResponse({ status: 200, description: 'Thời gian làm việc đã được cập nhật thành công' })
  async update(
    @Param('id') id: string,
    @Body() updateLocationAvailabilityDto: UpdateLocationAvailabilityDto,
  ): Promise<LocationAvailability> {
    try {
      if (!isUUID(id)) {
        throw new HttpException('ID không hợp lệ', HttpStatus.BAD_REQUEST);
      }
      return await this.locationAvailabilityService.update(id, updateLocationAvailabilityDto);
    } catch (error) {
      this.logger.error(`Lỗi cập nhật thời gian làm việc: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi cập nhật thời gian làm việc', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


}