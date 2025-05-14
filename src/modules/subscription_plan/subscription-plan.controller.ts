import { Controller, Get, Post, Put, Delete, Body, Query, Param } from '@nestjs/common';
import { SubscriptionPlanService } from './subscription-plan.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindSubscriptionPlanDto } from './dto/find-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';

@ApiTags('Subscription-plans')
@Controller('subscription-plans')
@ApiBearerAuth('access-token')
export class SubscriptionPlanController {
  constructor(private readonly subscriptionPlanService: SubscriptionPlanService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo gói đăng ký mới (Protected)' })
  @ApiResponse({ status: 201, description: 'Gói đăng ký đã được tạo thành công', type: SubscriptionPlan })
  @ApiResponse({ status: 401, description: 'Không được phép truy cập' })
  @ResponseMessage('Tạo gói đăng ký thành công')
  async create(@Body() createSubscriptionPlanDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    return this.subscriptionPlanService.create(createSubscriptionPlanDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy tất cả gói đăng ký (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách gói đăng ký với phân trang',
    type: [SubscriptionPlan],
  })
  @ResponseMessage('Lấy danh sách gói đăng ký thành công')
  async findAll(@Query() query: FindSubscriptionPlanDto): Promise<{
    data: SubscriptionPlan[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.subscriptionPlanService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Lấy gói đăng ký theo ID (Public)' })
  @ApiResponse({ status: 200, description: 'Gói đăng ký đã được tìm thấy', type: SubscriptionPlan })
  @ApiResponse({ status: 404, description: 'Gói đăng ký không tồn tại' })
  @ResponseMessage('Lấy thông tin gói đăng ký thành công')
  async findOne(@Param('id') id: string): Promise<SubscriptionPlan> {
    return this.subscriptionPlanService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật gói đăng ký theo ID' })
  @ApiResponse({ status: 200, description: 'Gói đăng ký đã được cập nhật thành công', type: SubscriptionPlan })
  @ApiResponse({ status: 404, description: 'Gói đăng ký không tồn tại' })
  async updateSubscriptionPlan(@Param('id') id: string, @Body() updateSubscriptionPlanDto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    return await this.subscriptionPlanService.updateSubscriptionPlan(id, updateSubscriptionPlanDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa gói đăng ký theo ID' })
  @ApiResponse({ status: 200, description: 'Gói đăng ký đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Gói đăng ký không tồn tại' })
  async deleteSubscriptionPlan(@Param('id') id: string): Promise<void> {
    return await this.subscriptionPlanService.deleteSubscriptionPlan(id);
  }
}