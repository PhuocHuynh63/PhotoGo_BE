import { Controller, Get, Post, Put, Delete, Body, Query, Param, Res } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
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
  @ApiOperation({ summary: 'Tạo thông báo mới (Protected)' })
  @ApiResponse({ status: 201, description: 'Thông báo được tạo thành công', type: Notification })
  @ApiResponse({ status: 401, description: 'Không được phép truy cập' })
  @ResponseMessage('Tạo thông báo thành công')
  async create(@Body() createNotificationDto: CreateNotificationDto): Promise<Notification> {
    return this.notificationService.create(createNotificationDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy tất cả thông báo (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách thông báo với phân trang',
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
  @ApiOperation({ summary: 'Lấy thông báo theo ID (Public)' })
  @ApiResponse({ status: 200, description: 'Thông báo được tìm thấy', type: Notification })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  @ResponseMessage('Lấy thông tin thông báo thành công')
  async findOne(@Param('id') id: string): Promise<Notification> {
    return this.notificationService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông báo theo ID' })
  @ApiResponse({ status: 200, description: 'Thông báo được cập nhật thành công', type: Notification })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  async update(@Param('id') id: string, @Body() updateNotificationDto: UpdateNotificationDto): Promise<Notification> {
    return this.notificationService.update(id, updateNotificationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa thông báo theo ID' })
  @ApiResponse({ status: 200, description: 'Thông báo được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.notificationService.remove(id);
  }
}