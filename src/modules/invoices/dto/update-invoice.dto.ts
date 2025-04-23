import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { InvoiceStatus } from 'src/constants/booking.enum';

export class UpdateInvoiceDto {
@IsEnum(InvoiceStatus)
  @IsOptional()
  @ApiProperty({ description: 'Status of the invoice', enum: InvoiceStatus, example: InvoiceStatus.PAID })
  status?: InvoiceStatus;
}