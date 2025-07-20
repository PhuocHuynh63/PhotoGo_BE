import { Controller, Get, Post, Put, Delete, Body, Query, Param } from '@nestjs/common';
import { PointService } from './point.service';
import { CreatePointDto, CreatePointTransactionDto } from './dto/create-point.dto';
import { UpdatePointDto } from './dto/update-point.dto';
import { Point } from './entities/point.entity';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindPointDto, FindMyTransactionsDto, FindMyPointHistoryDto } from './dto/find-point.dto';
import { PointTransaction } from './entities/point-transaction.entity';
import { CurrentUserId } from 'src/decorator/user.decorator';

@ApiTags('Points')
@Controller('points')
@ApiBearerAuth('access-token')
export class PointController {
  constructor(private readonly pointService: PointService) { }

  @Post()
  @ApiOperation({ summary: 'Tạo mới một điểm (Protected)' })
  @ApiResponse({ status: 201, description: 'Điểm đã được tạo thành công', type: Point })
  @ApiResponse({ status: 401, description: 'Không được phép' })
  @ResponseMessage('Tạo điểm thành công')
  async create(@Body() createPointDto: CreatePointDto): Promise<Point> {
    return this.pointService.create(createPointDto);
  }

  @Public()
  @Get('transactions')
  @ApiOperation({ summary: 'Lấy tất cả giao dịch điểm' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả giao dịch', type: [PointTransaction] })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giao dịch' })
  @ResponseMessage('Lấy danh sách giao dịch thành công')
  async findAllTransactions(): Promise<PointTransaction[]> {
    return this.pointService.findAllTransactions();
  }

  @Public()
  @Get('transactions/:pointId')
  @ApiOperation({ summary: 'Lấy giao dịch theo ID điểm' })
  @ApiResponse({ status: 200, description: 'Danh sách giao dịch cho điểm đã cho', type: [PointTransaction] })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giao dịch cho điểm đã cho' })
  async findTransactionsByPointId(@Param('pointId') pointId: string): Promise<PointTransaction[]> {
    return this.pointService.findTransactionsByPointId(pointId);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy tất cả điểm với phân trang, tìm kiếm và sắp xếp (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách điểm với phân trang, hỗ trợ tìm kiếm theo email/tên và sắp xếp theo balance, thời gian, email, tên',
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

  @Get('me')
  @ApiOperation({ summary: 'Lấy điểm của người dùng hiện tại' })
  @ApiResponse({
    status: 200,
    description: 'Điểm của người dùng hiện tại',
    type: Point,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy điểm cho người dùng này' })
  @ResponseMessage('Lấy thông tin điểm thành công')
  async findMyPoints(@CurrentUserId() userId: string): Promise<Point> {
    console.log('Current user ID from token:', userId);
    return this.pointService.findMyPoints(userId);
  }

  @Get('me/transactions')
  @ApiOperation({ summary: 'Lấy giao dịch điểm của người dùng hiện tại' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách giao dịch điểm của người dùng hiện tại',
    type: [PointTransaction],
  })
  @ResponseMessage('Lấy danh sách giao dịch điểm thành công')
  async findMyTransactions(
    @CurrentUserId() userId: string,
    @Query() query: FindMyTransactionsDto,
  ): Promise<{
    data: PointTransaction[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    console.log('Getting transactions for user ID:', userId);
    return this.pointService.findMyTransactions(userId, query);
  }

  @Get('/history/:userId')
  @ApiOperation({ summary: 'Lấy lịch sử thay đổi điểm của người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Lịch sử thay đổi điểm với phân trang và thống kê',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              amount: { type: 'number' },
              type: { type: 'string' },
              description: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
              balance_after: { type: 'number' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            current: { type: 'number' },
            pageSize: { type: 'number' },
            totalPage: { type: 'number' },
            totalItem: { type: 'number' },
          },
        },
        statistics: {
          type: 'object',
          properties: {
            totalEarned: { type: 'number' },
            totalRedeemed: { type: 'number' },
            totalExpired: { type: 'number' },
            currentBalance: { type: 'number' },
          },
        },
      },
    },
  })
  @ResponseMessage('Lấy lịch sử thay đổi điểm thành công')
  async findMyPointHistory(
    @Param('userId') userId: string,
    @Query() query: FindMyPointHistoryDto,
  ): Promise<{
    data: PointTransaction[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
    statistics: {
      totalEarned: number;
      totalRedeemed: number;
      totalExpired: number;
      currentBalance: number;
    };
  }> {
    console.log('Getting point history for user ID:', userId);
    return this.pointService.findMyPointHistory(userId, query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Lấy một điểm theo ID (Public)' })
  @ApiResponse({ status: 200, description: 'Điểm đã được tìm thấy', type: Point })
  @ApiResponse({ status: 404, description: 'Không tìm thấy điểm' })
  @ResponseMessage('Lấy thông tin điểm thành công')
  async findOne(@Param('id') id: string): Promise<Point> {
    return this.pointService.findOne(id);
  }

  @Post('transactions')
  @ApiOperation({ summary: 'Tạo mới một giao dịch điểm' })
  @ApiResponse({ status: 201, description: 'Giao dịch điểm đã được tạo thành công', type: PointTransaction })
  async createTransaction(@Body() createPointTransactionDto: CreatePointTransactionDto): Promise<PointTransaction> {
    return this.pointService.createTransaction(createPointTransactionDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật một điểm theo ID' })
  @ApiResponse({ status: 200, description: 'Điểm đã được cập nhật thành công', type: Point })
  @ApiResponse({ status: 404, description: 'Không tìm thấy điểm' })
  async update(@Param('id') id: string, @Body() updatePointDto: UpdatePointDto): Promise<Point> {
    return this.pointService.update(id, updatePointDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa một điểm theo ID' })
  @ApiResponse({ status: 200, description: 'Điểm đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy điểm' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.pointService.remove(id);
  }
}