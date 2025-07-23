import { IsOptional, IsEnum, IsUUID, IsString, IsBoolean, IsNumber } from 'class-validator';
import { PaymentStatus, PaymentType } from '../../../constants/payment.enum';
import { PaginationDto } from '../../subscription/dto/find-subscription.dto';
import { ApiProperty } from '@nestjs/swagger';

export class FindAllPaymentsDto {
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}

export class FindPaymentsByTransactionIdDto {
  @IsString()
  transactionId: string;  
}

export class FindAllPaymentTransactionsDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  @ApiProperty({ description: 'ID của nhà cung cấp', required: false, example: '123e4567-e89b-12d3-a456-426614174000' })
  vendorId?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  @ApiProperty({ description: 'Trạng thái thanh toán', required: false, enum: PaymentStatus, example: PaymentStatus.PAID })
  status?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentType)
  @ApiProperty({ description: 'Loại thanh toán', required: false, enum: PaymentType, example: PaymentType.DEPOSIT })
  type?: PaymentType;

  @IsBoolean()
  @ApiProperty({ description: 'Có thống kê doanh thu không', required: true, example: true })
  withStatistics: boolean;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ description: 'Năm', required: false, example: 2024 })
  year?: number;
}