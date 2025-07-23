import { PaymentMethod, PaymentStatus, PaymentType, PayerType } from '../../../constants/payment.enum';
import { IsEnum, IsNumber, IsString, IsUUID } from 'class-validator';
import { IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePaymentTransactionDto {
  @IsUUID()
  @IsOptional()
  @ApiProperty({ description: 'ID của payment', required: false, example: '123e4567-e89b-12d3-a456-426614174000' })
  paymentId?: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: 'Số tiền', required: false, example: 100000 })
  amount?: number;

  @IsEnum(PaymentMethod)
  @IsOptional()
  @ApiProperty({ description: 'Phương thức thanh toán', required: false, enum: PaymentMethod, example: PaymentMethod.PAYOS })
  paymentMethod?: PaymentMethod;

  @IsEnum(PaymentStatus)
  @IsOptional()
  @ApiProperty({ description: 'Trạng thái thanh toán', required: false, enum: PaymentStatus, example: PaymentStatus.PAID })
  status?: PaymentStatus;

  @IsEnum(PaymentType)
  @IsOptional()
  @ApiProperty({ description: 'Loại thanh toán', required: false, enum: PaymentType, example: PaymentType.DEPOSIT })
  type?: PaymentType;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Mô tả', required: false, example: 'Thanh toán cho đơn hàng 123' })
  description?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'ID giao dịch', required: false, example: '123e4567-e89b-12d3-a456-426614174000' })
  transactionId?: string;
} 