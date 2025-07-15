import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentType, PayerType } from '../../../constants/payment.enum';

export class CreatePaymentLinkDto {
  @ApiProperty({ description: 'ID của subscription invoice', required: true })
  @IsString()
  invoiceId: string;

  @ApiProperty({ description: 'Loại thanh toán', required: false, enum: PaymentType })
  @IsEnum(PaymentType)
  @IsOptional()
  type?: PaymentType;

  @ApiProperty({ description: 'Loại người thanh toán', required: false, enum: PayerType })
  @IsEnum(PayerType)
  @IsOptional()
  payerType?: PayerType;

  @ApiProperty({ description: 'ID người dùng (nếu payerType là CUSTOMER)', required: false })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: 'ID vendor (nếu payerType là VENDOR)', required: false })
  @IsUUID()
  @IsOptional()
  vendorId?: string;
} 