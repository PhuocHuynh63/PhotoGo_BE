import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { PaymentStatus } from '../../../constants/booking.enum';

export class FindAllPaymentsDto {
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}