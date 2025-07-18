import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from '../../users/user.service';
import { PointHelperService } from '../../points/point-helper.service';
import { Attendance } from './entities/attendance.entity';
import { PointTransactionType } from 'src/constants/point.enum';
import { NotificationService } from '../../notifications/notification.service';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    private userService: UserService,
    private pointHelperService: PointHelperService,
    private notificationService: NotificationService,
  ) { }

  //#region Điểm danh hàng ngày
  async checkIn(userId: string): Promise<Attendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await this.attendanceRepository.findOne({
      where: { userId, date: today },
    });

    if (attendance) {
      // Nếu đã điểm danh hôm nay, ném lỗi
      throw new BadRequestException('Bạn đã điểm danh hôm nay rồi!');
    }

    // Lấy thông tin user để gửi notification
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    // kiểm tra xem người dùng có điểm danh hôm qua không
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const previousAttendance = await this.attendanceRepository.findOne({
      where: { userId, date: yesterday },
    });

    const streak = previousAttendance ? previousAttendance.streak + 1 : 1;
    const pointsEarned = await this.calculatePoints(userId);

    attendance = this.attendanceRepository.create({
      userId,
      date: today,
      isChecked: true, // tạm thời để đó
      streak,
      pointsEarned,
    });

    const savedAttendance = await this.attendanceRepository.save(attendance);

    // Thêm điểm vào tài khoản người dùng
    await this.addPointsToUser(userId, pointsEarned);

    // Gửi thông báo điểm danh thành công
    try {
      await this.notificationService.notifyDailyCheckin(user, pointsEarned, streak);
      this.logger.log(`Gửi thông báo điểm danh thành công cho user ${userId}`);
    } catch (error) {
      this.logger.warn(`Gửi thông báo điểm danh không thành công cho user ${userId}: ${error.message}`);
      // Không throw error để không ảnh hưởng đến quá trình điểm danh
    }

    return savedAttendance;
  }
  //#endregion

  //#region Thêm điểm vào tài khoản người dùng
  private async addPointsToUser(userId: string, points: number): Promise<void> {
    try {
      console.log(`Adding ${points} points to user ${userId}`);

      // Sử dụng method chung từ PointHelperService
      const result = await this.pointHelperService.handleDailyCheckIn(userId, points);

      console.log('Successfully added points:', result.transaction.id);

    } catch (error) {
      console.error('Error adding points to user:', error);
      // Không throw error để không ảnh hưởng đến việc điểm danh
    }
  }
  //#endregion

  //#region Lấy lịch sử điểm danh ngày hiện tại
  async getRecentAttendance(userId: string): Promise<Attendance[]> {
    const attendances = await this.attendanceRepository.find({
      where: { userId },
      order: { date: 'DESC' },
    });

    if (attendances.length === 0) {
      throw new NotFoundException('Không tìm thấy lịch sử điểm danh gần đây.');
    }

    return attendances;
  }
  //#endregion

  //#region Kiểm tra xem hôm nay đã điểm danh chưa
  async hasCheckedInToday(userId: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await this.attendanceRepository.findOne({
      where: { userId, date: today },
    });

    return !!attendance;
  }
  //#endregion

  //#region Tính điểm thưởng
  private async calculatePoints(userId: string): Promise<number> {
    // Lấy người dùng từ UserService
    const user = await this.userService.findOne(userId);

    // Base points for attendance
    let points = 10;

    // Áp dụng multiplier
    points *= user.multiplier || 1;

    return points;
  }
  //#endregion

  //#region Lấy thông tin điểm danh
  async getUserAttendance(userId: string): Promise<Attendance[]> {
    return this.attendanceRepository.find({
      where: { userId },
      order: { date: 'DESC' },
    });
  }
  //#endregion

  //#region Lấy chuỗi liên tiếp
  async getStreak(userId: string): Promise<number> {
    const latestAttendance = await this.attendanceRepository.findOne({
      where: { userId },
      order: { date: 'DESC' },
    });

    return latestAttendance?.streak || 0;
  }
  //#endregion
}