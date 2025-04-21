import { Controller, Get, Post, Put, Delete, Body, Query, Param, Res } from '@nestjs/common';
import { LocationService } from './location.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { Location } from './entities/location.entity';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindLocationDto } from './dto/find-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@ApiTags('Locations')
@Controller('locations')
@ApiBearerAuth('access-token')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new location (Protected)' })
  @ApiResponse({ status: 201, description: 'Location created successfully', type: Location })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ResponseMessage('Tạo địa điểm thành công') 
  async create(@Body() createLocationDto: CreateLocationDto): Promise<Location> {
    return this.locationService.create(createLocationDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all locations (Public)' })
  @ApiResponse({
    status: 200,
    description: 'List of locations with pagination',
    type: [Location],
  })
  @ResponseMessage('Lấy danh sách địa điểm thành công')
  async findAll(@Query() query: FindLocationDto): Promise<{
    data: Location[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.locationService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a location by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Location found', type: Location })
  @ApiResponse({ status: 404, description: 'Location not found' })
  @ResponseMessage('Lấy thông tin địa điểm thành công')
  async findOne(@Param('id') id: string): Promise<Location> {
    return this.locationService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a location by ID' })
  @ApiResponse({ status: 200, description: 'Location updated successfully', type: Location })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async updateLocation(@Param('id') id: string, @Body() updateLocationDto: UpdateLocationDto): Promise<Location> {
    return await this.locationService.updateLocation(id, updateLocationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a location by ID' })
  @ApiResponse({ status: 200, description: 'Location deleted successfully' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async deleteLocation(@Param('id') id: string): Promise<void> {
    return await this.locationService.deleteLocation(id);
  }
}