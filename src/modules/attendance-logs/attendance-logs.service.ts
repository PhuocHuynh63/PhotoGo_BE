import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceLog } from './entities/attendance-log.entity';
import { Between } from 'typeorm';

@Injectable()
export class AttendanceLogsService {
  constructor(
    @InjectRepository(AttendanceLog)
    private attendanceLogRepository: Repository<AttendanceLog>,
  ) {}

  async create(
    userId: number,
    date: Date,
    action: string,
    pointsEarned: number,
    streak: number,
  ): Promise<AttendanceLog> {
    const log = this.attendanceLogRepository.create({
      userId,
      date,
      action,
      pointsEarned,
      streak,
    });
    return await this.attendanceLogRepository.save(log);
  }

  async getUserLogs(userId: number): Promise<AttendanceLog[]> {
    return await this.attendanceLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getLogsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<AttendanceLog[]> {
    return await this.attendanceLogRepository.find({
      where: {
        userId,
        date: Between(startDate, endDate),
      },
      order: { date: 'DESC' },
    });
  }

  async getTotalPoints(userId: number): Promise<number> {
    const result = await this.attendanceLogRepository
      .createQueryBuilder('log')
      .select('SUM(log.pointsEarned)', 'total')
      .where('log.userId = :userId', { userId })
      .getRawOne();
    
    return result?.total || 0;
  }
} 