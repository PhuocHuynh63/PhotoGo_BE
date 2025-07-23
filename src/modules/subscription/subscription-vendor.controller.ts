import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SubscriptionVendorService } from './subscription-vendor.service';
import { CreateSubscriptionVendorDto, UpdateSubscriptionVendorDto, SubscriptionVendorResponseDto } from './dto/subscription-vendor.dto';
import { HistoryDto, PaginationDto } from '../subscription/dto/find-subscription.dto';

@ApiTags('subscription-vendors')
@Controller('subscription-vendors')
export class SubscriptionVendorController {
  constructor(private readonly subscriptionVendorService: SubscriptionVendorService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo subscription vendor mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công', type: SubscriptionVendorResponseDto })
  create(@Body() createSubscriptionVendorDto: CreateSubscriptionVendorDto): Promise<SubscriptionVendorResponseDto> {
    return this.subscriptionVendorService.create(createSubscriptionVendorDto);
  }

  @Post('upgrade')
  @ApiOperation({ summary: 'Vendor nâng cấp lên gói subscription mới' })
  async upgradeSubscription(
    @Body() createSubscriptionVendorDto: CreateSubscriptionVendorDto
  ): Promise<SubscriptionVendorResponseDto> {
    // Kiểm tra điều kiện nâng cấp
    const canJoin = await this.subscriptionVendorService.canVendorJoinPlan(
      createSubscriptionVendorDto.vendorId,
      createSubscriptionVendorDto.planId
    );
    if (!canJoin.canJoin) {
      throw new Error(canJoin.reason || 'Không thể nâng cấp gói subscription');
    }
    // Nếu đủ điều kiện thì tạo mới
    return this.subscriptionVendorService.create(createSubscriptionVendorDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả subscription vendors' })
  @ApiResponse({ status: 200, description: 'Thành công', type: [SubscriptionVendorResponseDto] })
  findAll(): Promise<SubscriptionVendorResponseDto[]> {
    return this.subscriptionVendorService.findAll();
  }

  @Get('plan/:planId')
  @ApiOperation({ summary: 'Lấy danh sách vendors theo subscription plan ID' })
  @ApiParam({ name: 'planId', description: 'ID của subscription plan' })
  @ApiResponse({ status: 200, description: 'Thành công', type: [SubscriptionVendorResponseDto] })
  findByPlanId(@Param('planId') planId: string): Promise<SubscriptionVendorResponseDto[]> {
    return this.subscriptionVendorService.findByPlanId(planId);
  }

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Lấy danh sách subscriptions theo vendor ID' })
  @ApiParam({ name: 'vendorId', description: 'ID của vendor' })
  @ApiResponse({ status: 200, description: 'Thành công', type: [SubscriptionVendorResponseDto] })
  findByVendorId(@Param('vendorId') vendorId: string): Promise<SubscriptionVendorResponseDto[]> {
    return this.subscriptionVendorService.findByVendorId(vendorId);
  }

  @Get('vendor/:vendorId/plans-count')
  @ApiOperation({ summary: 'Lấy số lượng subscription plan mà vendor đang tham gia' })
  @ApiParam({ name: 'vendorId', description: 'ID của vendor' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  getVendorPlansCount(@Param('vendorId') vendorId: string) {
    return this.subscriptionVendorService.getVendorSubscriptionPlansCount(vendorId);
  }

  @Get('vendor/:vendorId/can-join/:planId')
  @ApiOperation({ summary: 'Kiểm tra xem vendor có thể tham gia subscription plan không' })
  @ApiParam({ name: 'vendorId', description: 'ID của vendor' })
  @ApiParam({ name: 'planId', description: 'ID của subscription plan' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  canVendorJoin(@Param('vendorId') vendorId: string, @Param('planId') planId: string) {
    return this.subscriptionVendorService.canVendorJoinPlan(vendorId, planId);
  }

  @Get('history/:vendorId')
  @ApiOperation({ summary: 'Lấy lịch sử subscription của vendor (group từng lần tham gia plan)' })
  @ApiParam({ name: 'vendorId', description: 'ID của vendor' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  @ApiQuery({ name: 'current', required: false, type: Number, description: 'Trang hiện tại' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Số lượng item trên mỗi trang' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Trường sắp xếp', enum: ['createdAt', 'updatedAt'] })
  @ApiQuery({ name: 'sortDirection', required: false, type: String, description: 'Thứ tự sắp xếp', enum: ['asc', 'desc'] })
  async getGroupedSubscriptionHistoryByVendorId(
    @Param('vendorId') vendorId: string,
    @Query() query: HistoryDto,
  ) {
    return this.subscriptionVendorService.getGroupedSubscriptionHistoryByVendorIdWithPagination(vendorId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin subscription vendor theo ID' })
  @ApiParam({ name: 'id', description: 'ID của subscription vendor' })
  @ApiResponse({ status: 200, description: 'Thành công', type: SubscriptionVendorResponseDto })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  findOne(@Param('id') id: string): Promise<SubscriptionVendorResponseDto> {
    return this.subscriptionVendorService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin subscription vendor' })
  @ApiParam({ name: 'id', description: 'ID của subscription vendor' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công', type: SubscriptionVendorResponseDto })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  update(
    @Param('id') id: string,
    @Body() updateSubscriptionVendorDto: UpdateSubscriptionVendorDto,
  ): Promise<SubscriptionVendorResponseDto> {
    return this.subscriptionVendorService.update(id, updateSubscriptionVendorDto);
  }

  @Patch(':id/end-participation')
  @ApiOperation({ summary: 'Kết thúc sự tham gia của vendor' })
  @ApiParam({ name: 'id', description: 'ID của subscription vendor' })
  @ApiQuery({ name: 'endedDate', description: 'Ngày kết thúc', type: Date })
  @ApiResponse({ status: 200, description: 'Kết thúc thành công', type: SubscriptionVendorResponseDto })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  endParticipation(
    @Param('id') id: string,
    @Query('endedDate') endedDate: string,
  ): Promise<SubscriptionVendorResponseDto> {
    const date = new Date(endedDate);
    return this.subscriptionVendorService.endVendorParticipation(id, date);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa subscription vendor' })
  @ApiParam({ name: 'id', description: 'ID của subscription vendor' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  remove(@Param('id') id: string): Promise<void> {
    return this.subscriptionVendorService.remove(id);
  }
} 