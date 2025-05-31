import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { PaymentStatus } from '../../../constants/payment.enum';

export class FindAllPaymentsDto {
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}