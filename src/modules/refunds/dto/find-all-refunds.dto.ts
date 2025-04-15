import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { RefundStatus } from '../../../constants/booking.enum';

export class FindAllRefundsDto {
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;
}