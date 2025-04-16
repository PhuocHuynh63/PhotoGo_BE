import { IsUUID, IsNotEmpty, IsNumber, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod, PaymentStatus } from '../../../constants/booking.enum';

export class CreatePaymentDto {
  @IsUUID()
  @IsNotEmpty()
  invoiceId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  transactionId?: string;
}