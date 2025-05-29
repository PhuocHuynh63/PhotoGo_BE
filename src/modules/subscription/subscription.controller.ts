import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { FindSubscriptionDto } from './dto/find-subscription.dto';
import { Subscription } from './entities/subscription.entity';
import { Public } from 'src/decorator/custom';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@ApiBearerAuth('access-token')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo gói đăng ký mới' })
  @ApiResponse({ status: 201, description: 'Gói đăng ký đã được tạo thành công', type: Subscription })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async create(@Body() createSubscriptionDto: CreateSubscriptionDto): Promise<Subscription> {
    return this.subscriptionService.create(createSubscriptionDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách gói đăng ký' })
  @ApiResponse({ status: 200, description: 'Danh sách gói đăng ký đã được lấy thành công', type: [Subscription] })
  async findAll(@Query() findSubscriptionDto: FindSubscriptionDto): Promise<{
    data: Subscription[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.subscriptionService.findAll(findSubscriptionDto);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Lấy thông tin gói đăng ký theo ID' })
  @ApiResponse({ status: 200, description: 'Gói đăng ký đã được tìm thấy', type: Subscription })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói đăng ký' })
  async findOne(@Param('id') id: string): Promise<Subscription> {
    return this.subscriptionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật gói đăng ký' })
  @ApiResponse({ status: 200, description: 'Gói đăng ký đã được cập nhật thành công', type: Subscription })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói đăng ký' })
  async update(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    return this.subscriptionService.update(id, updateSubscriptionDto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Hủy gói đăng ký' })
  @ApiResponse({ status: 200, description: 'Gói đăng ký đã được hủy thành công', type: Subscription })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói đăng ký' })
  async cancel(@Param('id') id: string): Promise<Subscription> {
    return this.subscriptionService.cancel(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa gói đăng ký' })
  @ApiResponse({ status: 200, description: 'Gói đăng ký đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói đăng ký' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.subscriptionService.remove(id);
  }
} 