import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './entity/attendance.entity';
import { UserService } from '../../users/user.service';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    private userService: UserService,
  ) {}

  //#region Điểm danh hàng ngày
  async checkIn(userId: string): Promise<Attendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await this.attendanceRepository.findOne({
      where: { userId, date: today }
    });

    if (attendance) {
        // If already checked in today, throw an error
        throw new Exception('Bạn đã điểm danh hôm nay rồi!');
    }

    // kiểm tra xem người dùng có điểm danh hôm qua không
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const previousAttendance = await this.attendanceRepository.findOne({
      where: { userId, date: yesterday }
    });

    const streak = previousAttendance ? previousAttendance.streak + 1 : 1;
    const pointsEarned = this.calculatePoints(streak);

    attendance = this.attendanceRepository.create({
      userId,
      date: today,
      isChecked: true,
      streak,
      pointsEarned,
    });

    return this.attendanceRepository.save(attendance);
  }
  //#endregion


  //#region Tính điểm thưởng
  private calculatePoints(streak: number): number {
    // Base points for attendance
    let points = 10;
    
    // Bonus points for streaks
    if (streak >= 7) points += 20;
    else if (streak >= 3) points += 10;
    
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