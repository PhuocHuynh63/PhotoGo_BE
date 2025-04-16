import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { InvoiceStatus } from 'src/constants/booking.enum'; // Import the InvoiceStatus enum

export class FindAllInvoicesDto {
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}