import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { UserService } from '../../users/user.service';
import { Attendance } from './entities/attendance.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    private userService: UserService,
  ) { }

  //#region Điểm danh hàng ngày
  async checkIn(userId: string): Promise<Attendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await this.attendanceRepository.findOne({
      where: { userId, date: today }
    });

    if (attendance) {
      // Nếu đã điểm danh hôm nay, ném lỗi
      throw new BadRequestException('Bạn đã điểm danh hôm nay rồi!');
    }

    // kiểm tra xem người dùng có điểm danh hôm qua không
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const previousAttendance = await this.attendanceRepository.findOne({
      where: { userId, date: yesterday }
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

    return this.attendanceRepository.save(attendance);
  }
  //#endregion

  //#region Lấy lịch sử điểm danh ngày hiện tại
  async getRecentAttendance(userId: string): Promise<Attendance[]> {
    const attendances = await this.attendanceRepository.find({
      where: { userId },
      order: { date: 'DESC' }
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
      where: { userId, date: today }
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
      order: { date: 'DESC' }
    });
  }
  //#endregion

  //#region Lấy chuỗi liên tiếp
  async getStreak(userId: string): Promise<number> {
    const latestAttendance = await this.attendanceRepository.findOne({
      where: { userId },
      order: { date: 'DESC' }
    });

    return latestAttendance?.streak || 0;
  }
  //#endregion


}