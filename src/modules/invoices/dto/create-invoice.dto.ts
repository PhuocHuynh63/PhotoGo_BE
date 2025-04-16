import { IsUUID, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  @IsNotEmpty()
  bookingId: string;

  @IsNumber()
  @IsNotEmpty()
  originalPrice: number;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  discountedPrice?: number;

  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  feeAmount?: number;

  @IsNumber()
  @IsNotEmpty()
  payablePrice: number;
}