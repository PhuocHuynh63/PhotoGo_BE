import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAttendanceLogDto } from './dto/attendance-log.dto';
import { AttendanceLog } from './entities/attendance-log.entity';

@Injectable()
export class AttendanceLogService {
    constructor(
        @InjectRepository(AttendanceLog)
        private attendanceLogRepository: Repository<AttendanceLog>,
    ) { }

    //#region tạo log điểm danh
    async createLog(dto: CreateAttendanceLogDto): Promise<CreateAttendanceLogDto> {
        const log = this.attendanceLogRepository.create(dto);
        return await this.attendanceLogRepository.save(log);
    }
    //#endregion

    async getUserLogs(userId: string): Promise<AttendanceLog[]> {
        return this.attendanceLogRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async getRecentLogs(limit: number = 10): Promise<AttendanceLog[]> {
        return this.attendanceLogRepository.find({
            order: { createdAt: 'DESC' },
            take: limit,
            relations: ['user'],
        });
    }
}