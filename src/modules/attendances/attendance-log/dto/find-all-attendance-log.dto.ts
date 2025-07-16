import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumberString, IsEnum } from 'class-validator';
import { AttendanceAction } from 'src/constants/attendances-log.enums';

export enum AttendanceLogSortField {
    CREATED_AT = 'createdAt',
    DATE = 'date',
    ACTION = 'action',
    POINTS_EARNED = 'pointsEarned',
    STREAK = 'streak',
}

export enum SortDirection {
    ASC = 'asc',
    DESC = 'desc',
}

export class FindAllAttendanceLogDto {
    @ApiPropertyOptional({ description: 'ID người dùng', type: String })
    @IsOptional()
    @IsString()
    userId?: string;

    @ApiPropertyOptional({ description: 'Hành động điểm danh', enum: AttendanceAction })
    @IsOptional()
    @IsEnum(AttendanceAction)
    action?: AttendanceAction;

    @ApiPropertyOptional({ description: 'Ngày điểm danh', type: String, example: '2025-07-11' })
    @IsOptional()
    @IsString()
    date?: string;

    @ApiPropertyOptional({ description: 'Trường sắp xếp', enum: AttendanceLogSortField, default: AttendanceLogSortField.CREATED_AT })
    @IsOptional()
    @IsEnum(AttendanceLogSortField)
    sortBy?: AttendanceLogSortField = AttendanceLogSortField.CREATED_AT;

    @ApiPropertyOptional({ description: 'Hướng sắp xếp', enum: SortDirection, default: SortDirection.DESC })
    @IsOptional()
    @IsEnum(SortDirection)
    sortDirection?: SortDirection = SortDirection.DESC;

    @ApiPropertyOptional({ description: 'Trang hiện tại', default: 1 })
    @IsOptional()
    @IsNumberString()
    current?: string = '1';

    @ApiPropertyOptional({ description: 'Số lượng mỗi trang', default: 10 })
    @IsOptional()
    @IsNumberString()
    pageSize?: string = '10';
}
