import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BookingDepositType } from '../../../constants/booking.enum';

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
}