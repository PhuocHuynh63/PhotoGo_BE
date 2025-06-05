import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
  ) {}

  async create(userId: number, date: Date): Promise<Attendance> {
    const attendance = this.attendanceRepository.create({
      userId,
      date,
      isChecked: true,
    });
    return await this.attendanceRepository.save(attendance);
  }

  async findByUserIdAndDate(userId: number, date: Date): Promise<Attendance> {
    const attendance = await this.attendanceRepository.findOne({
      where: { userId, date },
    });
    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }
    return attendance;
  }

  async updateStreak(userId: number, date: Date, streak: number): Promise<Attendance> {
    const attendance = await this.findByUserIdAndDate(userId, date);
    attendance.streak = streak;
    return await this.attendanceRepository.save(attendance);
  }

  async updatePoints(userId: number, date: Date, points: number): Promise<Attendance> {
    const attendance = await this.findByUserIdAndDate(userId, date);
    attendance.pointsEarned = points;
    return await this.attendanceRepository.save(attendance);
  }

  async getUserAttendanceHistory(userId: number): Promise<Attendance[]> {
    return await this.attendanceRepository.find({
      where: { userId },
      order: { date: 'DESC' },
    });
  }
} 