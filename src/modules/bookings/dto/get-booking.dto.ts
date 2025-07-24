import { IsEnum, IsNotEmpty, IsNumber, IsString, IsOptional, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BookingDepositType } from '../../../constants/booking.enum';

export class ScheduleItemDto {
  @ApiProperty({ description: 'Ngày booking (DD/MM/YYYY)', example: '21/07/2024' })
  @IsString()
  date: string;
}

export class GetDiscountAmountDto {
    @ApiProperty({ description: 'User ID', example: '123', required: true })
    @IsNotEmpty()
    @IsString()
    userId: string;

    @ApiProperty({ description: 'Service Concept ID', example: '123', required: true })
    @IsNotEmpty()
    @IsString()
    serviceConceptId: string;

    @ApiProperty({ description: 'Voucher ID', example: '123', required: false })
    @IsString()
    voucherId?: string;

    @ApiProperty({ description: 'Số tiền đặt cọc', example: 30, required: false })
    @IsNumber()
    depositAmount?: number;

    @ApiProperty({ description: 'Loại đặt cọc', enum: BookingDepositType, example: BookingDepositType.PERCENTAGE, required: false })
    @IsEnum(BookingDepositType)
    depositType?: BookingDepositType;

    @ApiProperty({ description: 'Danh sách ngày booking (multi-day)', required: false, type: [ScheduleItemDto], example: [{ date: '21/07/2024' }] })
    @IsOptional()
    @IsArray()
    @Type(() => ScheduleItemDto)
    schedules?: ScheduleItemDto[];

    @ApiProperty({ description: 'Ngày booking (DD/MM/YYYY)', example: '21/07/2024', required: true })
    @IsString()
    date: string;
}