import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './entities/notification.entity';
import { Public } from 'src/decorator/custom';
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
  async findOne(@Param('id') id: string): Promise<Notification> {
    return this.notificationService.findOne(id);
  }
}