import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from 'src/decorator/custom';
import { SubscriptionPlanService } from './subscription-plan.service';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto, FindSubscriptionPlanDto } from './dto/subscription-plan.dto';
import { SubscriptionPlan } from './entities/subscription-plan.entity';

@ApiTags('Subscription Plans')
@Controller('subscription-plans')
@ApiBearerAuth('access-token')
export class SubscriptionPlanController {
  constructor(private readonly subscriptionPlanService: SubscriptionPlanService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo gói đăng ký mới' })
  @ApiResponse({ status: 201, description: 'Gói đăng ký đã được tạo thành công', type: SubscriptionPlan })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async create(@Body() createSubscriptionPlanDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    return this.subscriptionPlanService.create(createSubscriptionPlanDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách gói đăng ký' })
  @ApiResponse({ status: 200, description: 'Danh sách gói đăng ký đã được lấy thành công', type: [SubscriptionPlan] })
  async findAll(@Query() findSubscriptionPlanDto: FindSubscriptionPlanDto): Promise<SubscriptionPlan[]> {
    return this.subscriptionPlanService.findAll(findSubscriptionPlanDto);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Lấy thông tin gói đăng ký theo ID' })
  @ApiResponse({ status: 200, description: 'Gói đăng ký đã được tìm thấy', type: SubscriptionPlan })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói đăng ký' })
  async findOne(@Param('id') id: string): Promise<SubscriptionPlan> {
    return this.subscriptionPlanService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật gói đăng ký' })
  @ApiResponse({ status: 200, description: 'Gói đăng ký đã được cập nhật thành công', type: SubscriptionPlan })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói đăng ký' })
  async update(
    @Param('id') id: string,
    @Body() updateSubscriptionPlanDto: UpdateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    return this.subscriptionPlanService.update(id, updateSubscriptionPlanDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa gói đăng ký' })
  @ApiResponse({ status: 200, description: 'Gói đăng ký đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói đăng ký' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.subscriptionPlanService.remove(id);
  }
} 