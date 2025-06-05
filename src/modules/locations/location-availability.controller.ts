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
import { CreateLocationAvailabilityDto } from './dto/create-location-availability.dto';
import { UpdateLocationAvailabilityDto } from './dto/update-location-availability.dto';
import { LocationAvailability } from './entities/location-availability.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { Public } from 'src/decorator/custom';
import { FindLocationAvailabilityDto } from './dto/find-location.dto';

@ApiTags('Location Availability')
@Controller('location-availability')
@ApiBearerAuth('access-token')
export class LocationAvailabilityController {
  private readonly logger = new Logger(LocationAvailabilityController.name);

  constructor(private readonly locationAvailabilityService: LocationAvailabilityService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo vị trí sẵn sàng' })
  @ApiResponse({ status: 201, description: 'Vị trí sẵn sàng đã được tạo thành công' })
  async create(@Body() createLocationAvailabilityDto: CreateLocationAvailabilityDto): Promise<LocationAvailability> {
    try {
      return await this.locationAvailabilityService.create(createLocationAvailabilityDto);
    } catch (error) {
      this.logger.error(`Lỗi tạo vị trí sẵn sàng: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi tạo vị trí sẵn sàng', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Lấy tất cả vị trí sẵn sàng' })
  @ApiResponse({ status: 200, description: 'Trả về tất cả vị trí sẵn sàng' })
  async findAll(@Query() query: FindLocationAvailabilityDto): Promise<{
    data: LocationAvailability[];
    current: number;
    pageSize: number;
    totalPage: number;
    totalItem: number;
  }> {
    try {
      return await this.locationAvailabilityService.findAll(query);
    } catch (error) {
      this.logger.error(`Lỗi tìm kiếm vị trí sẵn sàng: ${error.message}`);
      throw new HttpException('Lỗi tìm kiếm vị trí sẵn sàng', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('date-range')
  @Public()
  @ApiOperation({ summary: 'Lấy vị trí sẵn sàng theo khoảng thời gian' })
  @ApiResponse({ status: 200, description: 'Trả về vị trí sẵn sàng theo khoảng thời gian' })
  async findByDateRange(@Param('startDate') startDate: string, @Param('endDate') endDate: string, @Query() query: FindLocationAvailabilityDto): Promise<{
    data: LocationAvailability[];
    current: number;
    pageSize: number;
    totalPage: number;
    totalItem: number;
  }> {
    // check endDate is greater than startDate
    if (new Date(endDate) < new Date(startDate)) {
      throw new HttpException('Ngày kết thúc phải lớn hơn ngày bắt đầu', HttpStatus.BAD_REQUEST, {
        cause: new Error('Ngày kết thúc phải lớn hơn ngày bắt đầu'),
      });
    }
    try {
      return await this.locationAvailabilityService.findByDateRange(startDate, endDate, query);
    } catch (error) {
      this.logger.error(`Lỗi tìm kiếm vị trí sẵn sàng: ${error.message}`);
      throw new HttpException('Lỗi tìm kiếm vị trí sẵn sàng', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('date')
  @Public()
  @ApiOperation({ summary: 'Lấy vị trí sẵn sàng theo ngày' })
  @ApiResponse({ status: 200, description: 'Trả về vị trí sẵn sàng theo ngày' })
  async findByDate(@Param('date') date: string, @Query() query: FindLocationAvailabilityDto): Promise<{
    data: LocationAvailability[];
    current: number;
    pageSize: number;
    totalPage: number;
    totalItem: number;
  }> {
    try {
      return await this.locationAvailabilityService.findByDate(date, query);
    } catch (error) {
      this.logger.error(`Lỗi tìm kiếm vị trí sẵn sàng: ${error.message}`);
      throw new HttpException('Lỗi tìm kiếm vị trí sẵn sàng', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('location/:locationId')
  @ApiOperation({ summary: 'Lấy vị trí sẵn sàng theo ID vị trí' })
  @ApiResponse({ status: 200, description: 'Trả về vị trí sẵn sàng theo ID vị trí' })
  async findByLocationId(@Param('locationId') locationId: string, @Query() query: FindLocationAvailabilityDto): Promise<{
    data: LocationAvailability[];
    current: number;
    pageSize: number;
    totalPage: number;
    totalItem: number;
  }> {
    try {
      if (!isUUID(locationId)) {
        throw new HttpException('ID vị trí không hợp lệ', HttpStatus.BAD_REQUEST);
      }
      return await this.locationAvailabilityService.findByLocationId(query, locationId);
    } catch (error) {
      this.logger.error(`Lỗi tìm kiếm vị trí sẵn sàng: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi tìm kiếm vị trí sẵn sàng', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Lấy vị trí sẵn sàng theo ID' })
  @ApiResponse({ status: 200, description: 'Trả về vị trí sẵn sàng theo ID' })
  async findOne(@Param('id') id: string): Promise<LocationAvailability> {
    try {
      if (!isUUID(id)) {
        throw new HttpException('Invalid ID format', HttpStatus.BAD_REQUEST);
      }
      return await this.locationAvailabilityService.findOne(id);
    } catch (error) {
      this.logger.error(`Lỗi tìm kiếm vị trí sẵn sàng: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi tìm kiếm vị trí sẵn sàng', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật vị trí sẵn sàng' })
  @ApiResponse({ status: 200, description: 'Vị trí sẵn sàng đã được cập nhật thành công' })
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
      this.logger.error(`Lỗi cập nhật vị trí sẵn sàng: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi cập nhật vị trí sẵn sàng', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa vị trí sẵn sàng' })
  @ApiResponse({ status: 200, description: 'Vị trí sẵn sàng đã được xóa thành công' })
  async remove(@Param('id') id: string): Promise<void> {
    try {
      if (!isUUID(id)) {
        throw new HttpException('ID không hợp lệ', HttpStatus.BAD_REQUEST);
      }
      await this.locationAvailabilityService.remove(id);
    } catch (error) {
      this.logger.error(`Lỗi xóa vị trí sẵn sàng: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi xóa vị trí sẵn sàng', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

}