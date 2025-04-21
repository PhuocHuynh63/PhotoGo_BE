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
  @ApiOperation({ summary: 'Create a new subscription plan (Protected)' })
  @ApiResponse({ status: 201, description: 'Subscription Plan created successfully', type: SubscriptionPlan })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ResponseMessage('Tạo gói đăng ký thành công')
  async create(@Body() createSubscriptionPlanDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    return this.subscriptionPlanService.create(createSubscriptionPlanDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all subscription plans (Public)' })
  @ApiResponse({
    status: 200,
    description: 'List of subscription plans with pagination',
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
  @ApiOperation({ summary: 'Get a subscription plan by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Subscription Plan found', type: SubscriptionPlan })
  @ApiResponse({ status: 404, description: 'Subscription Plan not found' })
  @ResponseMessage('Lấy thông tin gói đăng ký thành công')
  async findOne(@Param('id') id: string): Promise<SubscriptionPlan> {
    return this.subscriptionPlanService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a subscription plan by ID' })
  @ApiResponse({ status: 200, description: 'Subscription plan updated successfully', type: SubscriptionPlan })
  @ApiResponse({ status: 404, description: 'Subscription plan not found' })
  async updateSubscriptionPlan(@Param('id') id: string, @Body() updateSubscriptionPlanDto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    return await this.subscriptionPlanService.updateSubscriptionPlan(id, updateSubscriptionPlanDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a subscription plan by ID' })
  @ApiResponse({ status: 200, description: 'Subscription plan deleted successfully' })
  @ApiResponse({ status: 404, description: 'Subscription plan not found' })
  async deleteSubscriptionPlan(@Param('id') id: string): Promise<void> {
    return await this.subscriptionPlanService.deleteSubscriptionPlan(id);
  }
}