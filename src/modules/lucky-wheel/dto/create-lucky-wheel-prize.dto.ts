import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsUUID, Min, Max, IsBoolean } from 'class-validator';
import { PrizeType } from '../entities/lucky-wheel-prize.entity';

export class CreateLuckyWheelPrizeDto {
    @ApiProperty({
        description: 'ID vòng quay',
        example: 'uuid-string',
    })
    @IsUUID()
    @IsNotEmpty()
    wheel_id: string;

    @ApiProperty({
        description: 'Tên phần thưởng',
        example: '100 điểm thưởng',
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: 'Loại phần thưởng',
        enum: PrizeType,
        example: PrizeType.POINTS,
    })
    @IsEnum(PrizeType)
    type: PrizeType;

    @ApiProperty({
        description: 'Giá trị điểm (nếu type = POINTS)',
        example: 100,
        required: false,
    })
    @IsNumber()
    @Min(0)
    @IsOptional()
    points_value?: number;

    @ApiProperty({
        description: 'ID voucher (nếu type = VOUCHER)',
        example: 'uuid-string',
        required: false,
    })
    @IsUUID()
    @IsOptional()
    voucher_id?: string;

    @ApiProperty({
        description: 'Xác suất trúng (%)',
        example: 15.5,
        minimum: 0,
        maximum: 100,
    })
    @IsNumber()
    @Min(0)
    @Max(100)
    probability: number;

    @ApiProperty({
        description: 'Số lượng tối đa (-1 = không giới hạn)',
        example: 100,
        default: -1,
    })
    @IsNumber()
    @Min(-1)
    @IsOptional()
    max_quantity?: number = -1;

    @ApiProperty({
        description: 'Trạng thái hoạt động',
        example: true,
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    is_active?: boolean = true;

    @ApiProperty({
        description: 'Mô tả phần thưởng',
        example: 'Phần thưởng 100 điểm cho người chơi may mắn',
        required: false,
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        description: 'Mã màu hiển thị (hex)',
        example: '#FF6B6B',
        required: false,
    })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiProperty({
        description: 'URL icon hiển thị',
        example: 'https://example.com/icon.png',
        required: false,
    })
    @IsString()
    @IsOptional()
    icon_url?: string;
} 