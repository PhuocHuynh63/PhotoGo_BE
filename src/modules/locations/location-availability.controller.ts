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
} from '@nestjs/common';
import { LocationAvailabilityService } from './location-availability.service';
import { CreateLocationTimeScheduleDto } from './dto/create-location-time-schedule.dto';
import { CreateLocationSlotTimeDto } from './dto/create-location-slot-time.dto';
import { UpdateLocationAvailabilityDto } from './dto/update-location-availability.dto';
import { LocationAvailability } from './entities/location-availability.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { Public } from 'src/decorator/custom';
import { FindLocationAvailabilityDto } from './dto/find-location.dto';
import { LocationSlotTime } from './entities/location-slot-time.entity';
import { UpdateLocationSlotTimeDto } from './dto/update-location-slot-time.dto';
import { LocationWorkingDate } from './entities/location-workingdate.entity';
import { CreateLocationWorkingDateDto } from './dto/create-location-working-date.dto';
import { FindLocationDateRangeDto } from './dto/find-location.dto';

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

  @Get('date')
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
      return await this.locationAvailabilityService.findByDate(date, query);
    } catch (error) {
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
}