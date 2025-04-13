import { Controller, Get, Post, Body, Query, Param, Res } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './entities/notification.entity';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindNotificationDto } from './dto/find-notification.dto';

@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth('access-token')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification (Protected)' })
  @ApiResponse({ status: 201, description: 'Notification created successfully', type: Notification })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ResponseMessage('Tạo thông báo thành công')
  async create(@Body() createNotificationDto: CreateNotificationDto): Promise<Notification> {
    return this.notificationService.create(createNotificationDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all notifications (Public)' })
  @ApiResponse({
    status: 200,
    description: 'List of notifications with pagination',
    type: [Notification],
  })
  @ResponseMessage('Lấy danh sách thông báo thành công')
  async findAll(@Query() query: FindNotificationDto): Promise<{
    data: Notification[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.notificationService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a notification by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Notification found', type: Notification })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ResponseMessage('Lấy thông tin thông báo thành công')
  async findOne(@Param('id') id: string): Promise<Notification> {
    return this.notificationService.findOne(id);
  }
}