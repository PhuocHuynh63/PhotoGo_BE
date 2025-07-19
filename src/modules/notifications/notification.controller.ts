import { Controller, Get, Post, Put, Delete, Body, Query, Param, Res, Patch, UseGuards, Request, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FindNotificationDto, FindNotificationDtoByUser } from './dto/find-notification.dto';
import { Notification } from './entities/notification.entity';
import { Public } from 'src/decorator/custom';
import { Roles } from 'src/decorator/role.decorator';
import { CurrentUser, CurrentUserId } from 'src/decorator/user.decorator';
import { NotificationSocketService } from './notification-socket.service';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';

@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth('access-token')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationSocketService: NotificationSocketService
  ) { }

  @Post()
  @ApiOperation({ summary: 'Tạo thông báo mới' })
  @ApiResponse({ status: 201, description: 'Thông báo được tạo thành công', type: Notification })
  @ApiResponse({ status: 401, description: 'Không được phép truy cập' })
  async create(@Body() createNotificationDto: CreateNotificationDto): Promise<Notification> {
    return this.notificationService.create(createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả thông báo (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách thông báo đã được lấy thành công',
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

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông báo theo ID' })
  @ApiResponse({ status: 200, description: 'Thông báo được tìm thấy', type: Notification })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  async findOne(@Param('id') id: string): Promise<Notification> {
    return this.notificationService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông báo' })
  @ApiResponse({ status: 200, description: 'Thông báo được cập nhật thành công', type: Notification })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  async update(@Param('id') id: string, @Body() updateNotificationDto: any): Promise<Notification> {
    return this.notificationService.update(id, updateNotificationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa thông báo' })
  @ApiResponse({ status: 200, description: 'Thông báo đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.notificationService.remove(id);
  }

  @Get('me/unread-count')
  @ApiOperation({ summary: 'Lấy số thông báo chưa đọc của user hiện tại' })
  async getMyUnreadCount(@CurrentUserId() userId: string) {
    return await this.notificationService.getUnreadCount(userId);
  }

  @Patch('me/mark-all-read')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
  async markAllAsRead(@CurrentUserId() userId: string) {
    return await this.notificationService.markAllAsRead(userId);
  }

  @Patch('me/mark-read/:notificationId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Đánh dấu thông báo đã đọc' })
  async markAsRead(@CurrentUserId() userId: string, @Param('notificationId') notificationId: string) {
    return await this.notificationService.markAsRead(userId, notificationId);
  }

  @Get('me/unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy số thông báo chưa đọc' })
  async getUnreadCount(@CurrentUserId() userId: string) {
    return await this.notificationService.getUnreadCount(userId);
  }

  @Get('user/me')
  @ApiOperation({ summary: 'Lấy thông báo của user cụ thể' })
  async getUserNotifications(
    @CurrentUserId() userId: string,
    @Query() query: FindNotificationDtoByUser,
  ): Promise<{
    data: any[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.notificationService.findNotificationsByUser(userId, query);
  }

  // === SOCKET TEST ENDPOINTS ===

  @Post('socket/test-send/:userId')
  @ApiOperation({ summary: 'Test gửi notification qua socket (Admin only)' })
  async testSocketNotification(
    @Param('userId') userId: string,
    @Body() body: { title: string; message: string; type?: string }
  ) {
    const { title, message, type = 'INFO' } = body;

    const notification = await this.notificationSocketService.createAndSendNotification(
      userId,
      title,
      message,
      type as any
    );

    return {
      success: true,
      message: 'Notification sent via socket',
      notification,
      userOnline: this.notificationSocketService.isUserOnline(userId)
    };
  }

  @Get('socket/online-users')
  @ApiOperation({ summary: 'Lấy danh sách users online (Admin only)' })
  async getOnlineUsers() {
    const onlineUsers = this.notificationSocketService.getOnlineUsers();

    return {
      onlineUsers,
      count: onlineUsers.length
    };
  }

  @Post('socket/broadcast')
  @ApiOperation({ summary: 'Gửi broadcast notification (Admin only)' })
  async sendBroadcastNotification(
    @Body() body: { title: string; message: string; type?: string }
  ) {
    const { title, message, type = 'INFO' } = body;

    await this.notificationSocketService.sendBroadcastNotification(
      title,
      message,
      type as any
    );

    return {
      success: true,
      message: 'Broadcast notification sent',
      onlineUsersCount: this.notificationSocketService.getOnlineUsers().length
    };
  }
}