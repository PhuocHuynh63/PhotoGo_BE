import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { PointService } from './point.service';
import { CreatePointDto } from './dto/create-point.dto';
import { Point } from './entities/point.entity';
import { Public } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindPointDto } from './dto/find-point.dto';

@ApiTags('Points')
@Controller('points')
@ApiBearerAuth('access-token')
export class PointController {
  constructor(private readonly pointService: PointService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new point entry (Protected)' })
  @ApiResponse({ status: 201, description: 'Point created successfully', type: Point })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createPointDto: CreatePointDto): Promise<Point> {
    return this.pointService.create(createPointDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all points (Public)' })
  @ApiResponse({
    status: 200,
    description: 'List of points with pagination',
    type: [Point],
  })
  async findAll(@Query() query: FindPointDto): Promise<{
    data: Point[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.pointService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a point entry by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Point found', type: Point })
  @ApiResponse({ status: 404, description: 'Point not found' })
  async findOne(@Param('id') id: string): Promise<Point> {
    return this.pointService.findOne(id);
  }
}