import { Controller, Get, Post, Put, Delete, Body, Query, Param, Res, Patch, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Notification } from './entities/notification.entity';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindNotificationDto, FindNotificationDtoByUser } from './dto/find-notification.dto';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';
import { Role } from '../roles/entities/role.entity';
import { Roles } from 'src/decorator/role.decorator';
import { CurrentUser, CurrentUserId } from 'src/decorator/user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @Post()
  @ApiOperation({ summary: 'Tạo thông báo mới (Protected)' })
  @ApiResponse({ status: 201, description: 'Thông báo được tạo thành công', type: Notification })
  @ApiResponse({ status: 401, description: 'Không được phép truy cập' })
  @ResponseMessage('Tạo thông báo thành công')
  async create(@Body() createNotificationDto: CreateNotificationDto): Promise<Notification> {
    return this.notificationService.create(createNotificationDto);
  }

  @Get()
  @Roles({ id: 'R005' } as Role)
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


  /**
   * Utility: Lấy số lượng notifications chưa đọc của user hiện tại
   */

  @Get('me/unread-count')
  @ApiOperation({ summary: 'Lấy số thông báo chưa đọc của user hiện tại' })
  @ResponseMessage('')
  async getMyUnreadCount(@CurrentUserId() userId: string) {
    return await this.notificationService.getUnreadCount(userId);
  }

  /**
   * Utility: Đánh dấu tất cả notifications là đã đọc (với security check)
   */
  @Patch('mark-all-read/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
  @ResponseMessage('Đã đánh dấu tất cả thông báo đã đọc')
  async markAllAsRead(@CurrentUserId() userId: string) {
    return await this.notificationService.markAllAsRead(userId);
  }

  @Patch('mark-as-read/:userId/:notificationId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Đánh dấu thông báo đã đọc' })
  @ResponseMessage('Đã đánh dấu thông báo đã đọc')
  async markAsRead(@CurrentUserId() userId: string, @Param('notificationId') notificationId: string) {
    return await this.notificationService.markAsRead(userId, notificationId);
  }

  /**
   * Utility: Lấy số lượng notifications chưa đọc (với security check)
   */
  @Get('unread-count/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy số thông báo chưa đọc' })
  @ResponseMessage('Không có thông báo chưa đọc')
  async getUnreadCount(@CurrentUserId() userId: string) {
    return await this.notificationService.getUnreadCount(userId);
  }

  /**
   * Lấy notifications của user cụ thể - Security: User chỉ được lấy notification của chính mình
   */
  @Get('user/me')
  @ApiOperation({ summary: 'Lấy thông báo của user cụ thể' })
  @ResponseMessage('Lấy thông báo của user cụ thể thành công')
  async getUserNotifications(
    @CurrentUserId() userId: string,
    @Query() query: FindNotificationDtoByUser
  ) {
    const notifications = await this.notificationService.findNotificationsByUser(userId, query);
    return notifications;
  }



}