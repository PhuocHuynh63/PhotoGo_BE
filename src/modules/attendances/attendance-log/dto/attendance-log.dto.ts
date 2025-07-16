import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { AttendanceAction } from 'src/constants/attendances-log.enums';

export class CreateAttendanceLogDto {
    @ApiProperty({
        description: 'Hành động điểm danh',
        enum: AttendanceAction,
        example: AttendanceAction.CHECK_IN,
       required: false,
    })
    @IsOptional()
    action: AttendanceAction;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    pointsEarned?: number;

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    streak?: number;

    @ApiProperty({ description: 'Ngày điểm danh', type: String, example: '2025-07-11' })
    @IsString()
    @IsOptional()
    date?: string;
    
}

export class AttendanceLogResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    userId: string;

    @ApiProperty()
    date: Date;

    @ApiProperty()
    action: string;

    @ApiProperty()
    pointsEarned: number;

    @ApiProperty()
    streak: number;

    @ApiProperty()
    createdAt: Date;
}