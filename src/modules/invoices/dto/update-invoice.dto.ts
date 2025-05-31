import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { InvoiceStatus } from 'src/constants/payment.enum';

export class UpdateInvoiceDto {
@IsEnum(InvoiceStatus)
  @IsOptional()
  @ApiProperty({ description: 'Trạng thái hóa đơn', enum: InvoiceStatus, example: InvoiceStatus.PAID })
  status?: InvoiceStatus;
}