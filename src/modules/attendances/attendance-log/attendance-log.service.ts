import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAttendanceLogDto } from './dto/attendance-log.dto';
import { AttendanceLog } from './entities/attendance-log.entity';
import { FindAllAttendanceLogDto, AttendanceLogSortField, SortDirection } from './dto/find-all-attendance-log.dto';

@Injectable()
export class AttendanceLogService {
    constructor(
        @InjectRepository(AttendanceLog)
        private attendanceLogRepository: Repository<AttendanceLog>,
    ) { }

    //#region tạo log điểm danh
    async createLog(userId: String, dto: CreateAttendanceLogDto): Promise<AttendanceLog> {
        if (!userId) {
            throw new Error('Id người dùng không được để trống');
        }
        // Gán userId vào dto
        (dto as any).userId = userId;
        const log = this.attendanceLogRepository.create(dto);
        return await this.attendanceLogRepository.save(log);
    }
    //#endregion

    //#region lấy log điểm danh của người dùng
    async getUserLogs(userId: string): Promise<AttendanceLog[]> {
        return this.attendanceLogRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }
    //#endregion

    //#region lấy log điểm danh gần đây
    async getRecentLogs(limit: number = 10): Promise<AttendanceLog[]> {
        return this.attendanceLogRepository.find({
            order: { createdAt: 'DESC' },
            take: limit,
            relations: ['user'],
        });
    }
    //#endregion

    async findOne(id: number): Promise<AttendanceLog> {
        return this.attendanceLogRepository.findOne({ where: { id: id.toString() }, relations: ['user'] });
    }

    async update(id: number, dto: Partial<CreateAttendanceLogDto>): Promise<AttendanceLog> {
        await this.attendanceLogRepository.update(id, dto);
        return this.findOne(id);
    }

    async remove(id: number): Promise<void> {
        await this.attendanceLogRepository.delete(id);
    }

    async findAll(query: FindAllAttendanceLogDto): Promise<{
        data: AttendanceLog[];
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

        const queryBuilder = this.attendanceLogRepository.createQueryBuilder('log')
            .leftJoinAndSelect('log.user', 'user');

        if (query.userId) {
            queryBuilder.andWhere('log.userId = :userId', { userId: query.userId });
        }
        if (query.action) {
            queryBuilder.andWhere('log.action = :action', { action: query.action });
        }
        if (query.date) {
            queryBuilder.andWhere('log.date = :date', { date: query.date });
        }

        // Sort
        const allowedSortFields = ['createdAt', 'date', 'action', 'pointsEarned', 'streak'];
        const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
        const sortDirection = query.sortDirection === 'asc' ? 'ASC' : 'DESC';
        queryBuilder.addOrderBy(`log.${sortField}`, sortDirection);

        // Pagination
        queryBuilder.skip(skip).take(pageSize);

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
    //#endregion
}