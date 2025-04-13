import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { LocationService } from './location.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { Location } from './entities/location.entity';
import { Public } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindLocationDto } from './dto/find-location.dto';

@ApiTags('Locations')
@Controller('locations')
@ApiBearerAuth('access-token')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new location (Protected)' })
  @ApiResponse({ status: 201, description: 'Location created successfully', type: Location })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  async findOne(@Param('id') id: string): Promise<Location> {
    return this.locationService.findOne(id);
  }
}