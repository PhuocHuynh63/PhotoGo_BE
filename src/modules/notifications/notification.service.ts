import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FindNotificationDto, FindNotificationDtoByUser } from './dto/find-notification.dto';
import { NotificationType } from '../../constants/notification.enum';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) { }

  //#region create
  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create(createNotificationDto);
    return this.notificationRepository.save(notification);
  }
  //#endregion create

  //#region findAll
  async findAll(query: FindNotificationDto): Promise<{
    data: Notification[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    //#region Pagination
    const currentPage = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;
    //#endregion

    //#region Filter
    const queryBuilder = this.notificationRepository.createQueryBuilder('notification');

    //# Add relations to the query builder
    queryBuilder.leftJoinAndSelect('notification.user', 'user');


    if (query.type) {
      queryBuilder.andWhere('notification.type = :type', { type: query.type });
    }

    if (query.is_read !== undefined) {
      queryBuilder.andWhere('notification.is_read = :is_read', { is_read: query.is_read });
    }
    //#endregion

    //#region Sort
    const allowedSortFields = ['created_at', 'title', 'type', 'is_read'];
    const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'created_at';
    const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';

    queryBuilder.orderBy(`notification.${sortField}`, sortDirection);
    //#endregion

    //#region Pagination
    queryBuilder.skip(skip).take(pageSize);
    //#endregion

    const [data, totalItem] = await queryBuilder.getManyAndCount();
    const totalPage = Math.ceil(totalItem / pageSize);

    return {
      data,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage,
        totalItem,
      },
    };
  }
  //#endregion findAll

  //#region findOne
  async findOne(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!notification) {
      throw new NotFoundException(`Thông báo với ID ${id} không tồn tại`);
    }
    return notification;
  }
  //#endregion findOne

  //#region update
  async update(id: string, updateNotificationDto: Partial<CreateNotificationDto>): Promise<Notification> {
    await this.notificationRepository.update(id, updateNotificationDto);
    return this.findOne(id);
  }
  //#endregion update

  //#region remove
  async remove(id: string): Promise<void> {
    const notification = await this.findOne(id);
    await this.notificationRepository.remove(notification);
  }
  //#endregion remove

  //#region notifyLogin
  /**
   * 1. Thông báo đăng nhập thành công
   */
  async notifyLogin(user: User, deviceInfo?: string, loginMethod?: string): Promise<Notification> {
    const currentTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const methodText = loginMethod ? ` qua ${loginMethod}` : '';

    // Create notification directly with repository instead of using DTO
    const notification = this.notificationRepository.create({
      user: { id: user.id }, // Use user id only
      title: 'Đăng nhập thành công',
      message: `Chào mừng ${user.fullName}! Bạn đã đăng nhập vào PhotoGo${methodText} lúc ${currentTime}${deviceInfo ? ` từ ${deviceInfo}` : ''}`,
      type: NotificationType.LOGIN,
      is_read: false,
    });

    return this.notificationRepository.save(notification);
  }
  //#endregion notifyLogin

  //#region notifyDailyCheckin
  /**
   * 2. Thông báo điểm danh thành công
   */
  async notifyDailyCheckin(user: User, pointsEarned: number, consecutiveDays: number): Promise<Notification> {
    const streakBonus = consecutiveDays >= 7 ? ' 🔥 Streak 7 ngày!' : '';
    const streakMessage = consecutiveDays > 1 ? ` Chuỗi điểm danh: ${consecutiveDays} ngày liên tiếp.` : '';

    const notification = this.notificationRepository.create({
      user: { id: user.id },
      title: 'Điểm danh thành công!',
      message: `Bạn đã nhận được ${pointsEarned} điểm từ việc điểm danh hôm nay.${streakMessage}${streakBonus} Hãy tiếp tục duy trì!`,
      type: NotificationType.INFO, // Temporarily use INFO until we update database enum
      is_read: false,
    });

    return this.notificationRepository.save(notification);
  }
  //#endregion notifyDailyCheckin

  //#region notifyVoucherExchange
  /**
   * 3. Thông báo đổi voucher và trừ điểm
   */
  async notifyVoucherExchange(user: User, voucherCode: string): Promise<Notification> {
    const notification = this.notificationRepository.create({
      user: { id: user.id },
      title: 'Đổi voucher thành công!',
      message: `Bạn đã nhận được voucher "${voucherCode}". Hãy kiểm tra trong "Mã ưu đãi" để sử dụng.`,
      type: NotificationType.SUCCESS, // Use SUCCESS for voucher received
      is_read: false,
    });

    return this.notificationRepository.save(notification);
  }
  //#endregion notifyVoucherExchange

  //#region notifyPointDeduction
  /**
   * 4. Thông báo bị trừ điểm
   */
  async notifyPointDeduction(user: User, pointsDeducted: number, reason: string): Promise<Notification> {
    const notification = this.notificationRepository.create({
      user: { id: user.id },
      title: 'Trừ điểm',
      message: `Bạn đã bị trừ ${pointsDeducted} điểm cho ${reason}.`,
      type: NotificationType.WARNING, // Use WARNING for point deduction
      is_read: false,
    });

    return this.notificationRepository.save(notification);
  }
  //#endregion notifyPointDeduction

  //#region markAllAsRead
  /**
   * Utility: Đánh dấu tất cả notifications của user là đã đọc
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { user: { id: userId }, is_read: false },
      { is_read: true }
    );
  }
  //#endregion markAllAsRead

  //#region markAsRead
  /**
   * Utility: Đánh dấu thông báo đã đọc
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId, user: { id: userId } },
      { is_read: true }
    );
  }
  //#endregion markAsRead

  //#region getUnreadCount
  /**
   * Utility: Lấy số lượng notifications chưa đọc
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { user: { id: userId }, is_read: false },
    });
  }
  //#endregion getUnreadCount

  //#region findNotificationsByUser
  /**
   * Lấy notifications của user cụ thể với pagination và filter
   */
  async findNotificationsByUser(userId: string, query: FindNotificationDtoByUser): Promise<{
    data: any[]; // Đổi sang any[] để map lại structure
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const currentPage = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;

    const queryBuilder = this.notificationRepository.createQueryBuilder('notification');

    // Add relations to the query builder
    queryBuilder.leftJoinAndSelect('notification.user', 'user');

    // Filter by user ID
    queryBuilder.andWhere('notification.user.id = :userId', { userId });

    if (query.type) {
      queryBuilder.andWhere('notification.type = :type', { type: query.type });
    }

    // Sort by created_at descending (newest first)  
    queryBuilder.orderBy('notification.created_at', 'DESC');

    // Pagination
    queryBuilder.skip(skip).take(pageSize);

    const [data, totalItem] = await queryBuilder.getManyAndCount();
    const totalPage = Math.ceil(totalItem / pageSize);
    console.log('DEBUG full query:', query);

    // Map lại để chỉ trả về userId thay vì object user
    const mappedData = data.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      is_read: n.is_read,
      created_at: n.created_at,
      userId: n.user?.id || userId,
    }));

    return {
      data: mappedData,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage,
        totalItem,
      },
    };
  }
  //#endregion findNotificationsByUser

  //#region notifySubscriptionRenewalReminder
  /**
   * 5. Thông báo nhắc gia hạn subscription (24h trước nextBillingAt)
   */
  async notifySubscriptionRenewalReminder(user: User, subscription: any, hoursUntilRenewal: number): Promise<Notification> {
    const planName = subscription.plan?.name || 'gói đăng ký';
    const billingDate = new Date(subscription.nextBillingAt).toLocaleDateString('vi-VN');

    let timeMessage = '';
    if (hoursUntilRenewal <= 24 && hoursUntilRenewal > 0) {
      timeMessage = `còn ${hoursUntilRenewal} giờ`;
    } else if (hoursUntilRenewal <= 0) {
      timeMessage = 'hôm nay';
    } else {
      timeMessage = `vào ngày ${billingDate}`;
    }

    const notification = this.notificationRepository.create({
      user: { id: user.id },
      title: 'Nhắc nhở gia hạn đăng ký',
      message: `Gói đăng ký "${planName}" của bạn sẽ được gia hạn ${timeMessage}. Hãy đảm bảo tài khoản đủ số dư để thanh toán tự động.`,
      type: NotificationType.INFO,
      is_read: false,
    });

    return this.notificationRepository.save(notification);
  }
  //#endregion notifySubscriptionRenewalReminder

  //#region notifySubscriptionExpired
  /**
   * 6. Thông báo subscription đã hết hạn
   */
  async notifySubscriptionExpired(user: User, subscription: any): Promise<Notification> {
    const planName = subscription.plan?.name || 'gói đăng ký';
    const endDate = new Date(subscription.endDate).toLocaleDateString('vi-VN');

    const notification = this.notificationRepository.create({
      user: { id: user.id },
      title: 'Gói đăng ký đã hết hạn',
      message: `Gói đăng ký "${planName}" của bạn đã hết hạn vào ngày ${endDate}. Hãy gia hạn để tiếp tục sử dụng dịch vụ.`,
      type: NotificationType.WARNING,
      is_read: false,
    });

    return this.notificationRepository.save(notification);
  }
  //#endregion notifySubscriptionExpired

}