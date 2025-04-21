import { Controller, Get, Post, Put, Delete, Body, Query, Param } from '@nestjs/common';
import { PointService } from './point.service';
import { CreatePointDto, CreatePointTransactionDto } from './dto/create-point.dto';
import { UpdatePointDto } from './dto/update-point.dto';
import { Point } from './entities/point.entity';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindPointDto } from './dto/find-point.dto';
import { PointTransaction } from './entities/point-transaction.entity';

@ApiTags('Points')
@Controller('points')
@ApiBearerAuth('access-token')
export class PointController {
  constructor(private readonly pointService: PointService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new point entry (Protected)' })
  @ApiResponse({ status: 201, description: 'Point created successfully', type: Point })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ResponseMessage('Tạo điểm thành công')
  async create(@Body() createPointDto: CreatePointDto): Promise<Point> {
    return this.pointService.create(createPointDto);
  }

  @Public()
  @Get('transactions')
  @ApiOperation({ summary: 'Get all point transactions' })
  @ApiResponse({ status: 200, description: 'List of all transactions', type: [PointTransaction] })
  @ApiResponse({ status: 404, description: 'No transactions found' })
  @ResponseMessage('Lấy danh sách giao dịch thành công')
  async findAllTransactions(): Promise<PointTransaction[]> {
    return this.pointService.findAllTransactions();
  }

  @Public()
  @Get('transactions/:pointId')
  @ApiOperation({ summary: 'Get transactions by point ID' })
  @ApiResponse({ status: 200, description: 'List of transactions for the given point ID', type: [PointTransaction] })
  @ApiResponse({ status: 404, description: 'No transactions found for the given point ID' })
  async findTransactionsByPointId(@Param('pointId') pointId: string): Promise<PointTransaction[]> {
    return this.pointService.findTransactionsByPointId(pointId);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all points (Public)' })
  @ApiResponse({
    status: 200,
    description: 'List of points with pagination',
    type: [Point],
  })
  @ResponseMessage('Lấy danh sách điểm thành công')
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
  @ResponseMessage('Lấy thông tin điểm thành công')
  async findOne(@Param('id') id: string): Promise<Point> {
    return this.pointService.findOne(id);
  }

  @Post('transactions')
  @ApiOperation({ summary: 'Create a new point transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully', type: PointTransaction })
  async createTransaction(@Body() createPointTransactionDto: CreatePointTransactionDto): Promise<PointTransaction> {
    return this.pointService.createTransaction(createPointTransactionDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a point entry by ID' })
  @ApiResponse({ status: 200, description: 'Point updated successfully', type: Point })
  @ApiResponse({ status: 404, description: 'Point not found' })
  async update(@Param('id') id: string, @Body() updatePointDto: UpdatePointDto): Promise<Point> {
    return this.pointService.update(id, updatePointDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a point entry by ID' })
  @ApiResponse({ status: 200, description: 'Point deleted successfully' })
  @ApiResponse({ status: 404, description: 'Point not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.pointService.remove(id);
  }
}