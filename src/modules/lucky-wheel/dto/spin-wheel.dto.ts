import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class SpinWheelDto {
    @ApiProperty({
        description: 'ID vòng quay',
        example: 'uuid-string',
    })
    @IsUUID()
    @IsNotEmpty()
    wheel_id: string;
}

export class SpinResultDto {
    @ApiProperty({
        description: 'ID spin record',
        example: 'uuid-string',
    })
    spin_id: string;

    @ApiProperty({
        description: 'Trạng thái thành công',
        example: true,
    })
    success: boolean;

    @ApiProperty({
        description: 'Thông báo kết quả',
        example: 'Chúc mừng! Bạn đã trúng 100 điểm!',
    })
    message: string;

    @ApiProperty({
        description: 'Thông tin phần thưởng',
        required: false,
    })
    prize?: {
        id: string;
        name: string;
        type: string;
        points_value?: number;
        voucher?: {
            id: string;
            code: string;
            description: string;
        };
        color?: string;
        icon_url?: string;
    };

    @ApiProperty({
        description: 'Góc quay (degrees)',
        example: 45.5,
    })
    spin_angle: number;

    @ApiProperty({
        description: 'Số lần quay còn lại hôm nay',
        example: 2,
    })
    remaining_spins: number;

    @ApiProperty({
        description: 'Số điểm hiện tại của user',
        example: 1500,
    })
    current_points: number;
}

export class FindSpinHistoryDto {
    @ApiProperty({
        description: 'Trang hiện tại',
        example: 1,
        default: 1,
        required: false,
    })
    @IsNumber()
    @Min(1)
    @IsOptional()
    current?: number = 1;

    @ApiProperty({
        description: 'Số lượng mỗi trang',
        example: 10,
        default: 10,
        required: false,
    })
    @IsNumber()
    @Min(1)
    @Max(100)
    @IsOptional()
    pageSize?: number = 10;

    @ApiProperty({
        description: 'ID vòng quay (filter)',
        example: 'uuid-string',
        required: false,
    })
    @IsUUID()
    @IsOptional()
    wheel_id?: string;
} 