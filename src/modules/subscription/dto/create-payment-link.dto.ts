import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentSubscriptionType } from '../../../constants/payment.enum';

export class CreatePaymentLinkDto {
  @ApiProperty({ description: 'ID của plan', required: true })
  @IsString()
  planId: string;

  @ApiProperty({ description: 'Loại thanh toán', required: false, enum: PaymentSubscriptionType, example: PaymentSubscriptionType.FULL_PAYMENT })
  @IsEnum(PaymentSubscriptionType)
  @IsOptional()
  type?: PaymentSubscriptionType;

  // @ApiProperty({ description: 'Loại người thanh toán', required: false, enum: PayerType })
  // @IsEnum(PayerType)
  // @IsOptional()
  // payerType?: PayerType;

  @ApiProperty({ description: 'ID người dùng (nếu payerType là CUSTOMER)', required: false })
  @IsUUID()
  @IsOptional()
  userId?: string;

  // @ApiProperty({ description: 'ID vendor (nếu payerType là VENDOR)', required: false })
  // @IsUUID()
  // @IsOptional()
  // vendorId?: string;
} 