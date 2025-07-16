import { Controller, Get, Post, Put, Delete, Body, Query, Param, Res, Patch, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Notification } from './entities/notification.entity';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindNotificationDto } from './dto/find-notification.dto';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';
import { Role } from '../roles/entities/role.entity';
import { Roles } from 'src/decorator/role.decorator';

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
   * Utility: Đánh dấu tất cả notifications của user hiện tại là đã đọc
   */
  @Patch('me/mark-all-read')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo của user hiện tại đã đọc' })
  @ResponseMessage('All notifications marked as read')
  async markMyNotificationsAsRead(@Request() req: any) {
    const currentUserId = req.user?.userId || req.user?.sub;
    await this.notificationService.markAllAsRead(currentUserId);
    return { statusCode: 200, message: 'All notifications marked as read' };
  }

  /**
   * Utility: Lấy số lượng notifications chưa đọc của user hiện tại
   */
  @Get('me/unread-count')
  @ApiOperation({ summary: 'Lấy số thông báo chưa đọc của user hiện tại' })
  @ResponseMessage('Unread count retrieved')
  async getMyUnreadCount(@Request() req: any) {
    const currentUserId = req.user?.userId || req.user?.sub;
    const count = await this.notificationService.getUnreadCount(currentUserId);
    return { statusCode: 200, message: 'Unread count retrieved', data: { count } };
  }

  /**
   * Utility: Đánh dấu tất cả notifications là đã đọc (với security check)
   */
  @Patch('mark-all-read/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
  @ResponseMessage('All notifications marked as read')
  async markAllAsRead(@Param('userId') userId: string, @Request() req: any) {
    // Security check: User chỉ được mark notifications của chính mình
    const currentUserId = req.user?.userId || req.user?.sub;

    if (currentUserId !== userId) {
      throw new ForbiddenException('Bạn chỉ có thể đánh dấu thông báo của chính mình');
    }

    await this.notificationService.markAllAsRead(userId);
    return { statusCode: 200, message: 'All notifications marked as read' };
  }

  /**
   * Utility: Lấy số lượng notifications chưa đọc (với security check)
   */
  @Get('unread-count/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy số thông báo chưa đọc' })
  @ResponseMessage('Unread count retrieved')
  async getUnreadCount(@Param('userId') userId: string, @Request() req: any) {
    // Security check: User chỉ được lấy count của chính mình
    const currentUserId = req.user?.userId || req.user?.sub;

    if (currentUserId !== userId) {
      throw new ForbiddenException('Bạn chỉ có thể xem số thông báo của chính mình');
    }

    const count = await this.notificationService.getUnreadCount(userId);
    return { statusCode: 200, message: 'Unread count retrieved', data: { count } };
  }

  /**
   * Lấy notifications của chính user hiện tại (convenient endpoint)
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy thông báo của user hiện tại' })
  @ResponseMessage('Lấy thông báo của user hiện tại thành công')
  async getMyNotifications(
    @Query() query: FindNotificationDto,
    @Request() req: any
  ) {
    const currentUserId = req.user?.userId || req.user?.sub;
    const notifications = await this.notificationService.findNotificationsByUser(currentUserId, query);
    return notifications;
  }

  /**
   * Lấy notifications của user cụ thể - Security: User chỉ được lấy notification của chính mình
   */
  @Get('user/:userId')
  @ApiOperation({ summary: 'Lấy thông báo của user cụ thể' })
  @ResponseMessage('Lấy thông báo của user cụ thể thành công')
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query() query: FindNotificationDto,
    @Request() req: any
  ) {
    // Security check: User chỉ được lấy notification của chính mình
    const currentUserId = req.user?.userId || req.user?.sub;

    if (currentUserId !== userId) {
      throw new ForbiddenException('Bạn chỉ có thể xem thông báo của chính mình');
    }

    const notifications = await this.notificationService.findNotificationsByUser(userId, query);
    return notifications;
  }

  /**
   * Test endpoint để gửi cả 2 notifications cho quá trình đổi voucher hoàn chỉnh
   */
  @Public()
  @Post('test/complete-voucher-exchange/:userId')
  @ApiOperation({ summary: 'Test gửi cả 2 thông báo cho quá trình đổi voucher hoàn chỉnh' })
  @ResponseMessage('Test complete voucher exchange notifications sent successfully')
  async testCompleteVoucherExchange(@Param('userId') userId: string) {
    // Mock user object - in production this should come from auth
    const mockUser = {
      id: userId,
      fullName: 'Test User',
      email: 'test@example.com'
    } as any;

    // Mock voucher exchange data
    const voucherCodes = ['GIAM50K', 'FREESHIP', 'DISCOUNT20', 'NEWUSER', 'SUMMER2024'];
    const voucherCode = voucherCodes[Math.floor(Math.random() * voucherCodes.length)];
    const pointsDeducted = Math.floor(Math.random() * 100) + 10; // 10-110 points

    // 1. Send point deduction notification first
    const pointDeductionNotification = await this.notificationService.notifyPointDeduction(
      mockUser,
      pointsDeducted,
      `đổi voucher "${voucherCode}"`
    );

    // Simulate small delay between notifications (like real process)
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. Send voucher success notification
    const voucherSuccessNotification = await this.notificationService.notifyVoucherExchange(
      mockUser,
      voucherCode
    );

    return {
      statusCode: 200,
      message: 'Complete voucher exchange notifications sent',
      data: {
        pointDeductionNotification,
        voucherSuccessNotification,
        mockData: { voucherCode, pointsDeducted },
        processFlow: [
          `1. Trừ ${pointsDeducted} điểm cho đổi voucher "${voucherCode}"`,
          `2. Nhận voucher "${voucherCode}" thành công`
        ]
      }
    };
  }

  //#endregion Test và Utility Endpoints


}