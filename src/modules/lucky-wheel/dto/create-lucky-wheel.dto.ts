import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsDateString, IsUUID, Min, Max } from 'class-validator';
import { LuckyWheelStatus, LuckyWheelType } from '../entities/lucky-wheel.entity';

export class CreateLuckyWheelDto {
    @ApiProperty({
        description: 'Tên vòng quay',
        example: 'Vòng quay may mắn hàng ngày',
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: 'Mô tả vòng quay',
        example: 'Vòng quay với nhiều phần thưởng hấp dẫn',
        required: false,
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        description: 'Loại vòng quay',
        enum: LuckyWheelType,
        example: LuckyWheelType.FREE,
    })
    @IsEnum(LuckyWheelType)
    type: LuckyWheelType;

    @ApiProperty({
        description: 'Số điểm cần để quay (0 = miễn phí)',
        example: 100,
        default: 0,
    })
    @IsNumber()
    @Min(0)
    @IsOptional()
    cost_points?: number = 0;

    @ApiProperty({
        description: 'Giới hạn số lần quay mỗi ngày',
        example: 3,
        default: 1,
    })
    @IsNumber()
    @Min(1)
    @Max(100)
    @IsOptional()
    daily_spin_limit?: number = 1;

    @ApiProperty({
        description: 'Trạng thái vòng quay',
        enum: LuckyWheelStatus,
        example: LuckyWheelStatus.ACTIVE,
        default: LuckyWheelStatus.ACTIVE,
    })
    @IsEnum(LuckyWheelStatus)
    @IsOptional()
    status?: LuckyWheelStatus = LuckyWheelStatus.ACTIVE;

    @ApiProperty({
        description: 'Ngày bắt đầu (ISO string)',
        example: '2024-01-01',
        required: false,
    })
    @IsDateString()
    @IsOptional()
    start_date?: string;

    @ApiProperty({
        description: 'Ngày kết thúc (ISO string)',
        example: '2024-12-31',
        required: false,
    })
    @IsDateString()
    @IsOptional()
    end_date?: string;

    @ApiProperty({
        description: 'ID campaign (nếu là part của campaign)',
        example: 'uuid-string',
        required: false,
    })
    @IsUUID()
    @IsOptional()
    campaign_id?: string;
} 