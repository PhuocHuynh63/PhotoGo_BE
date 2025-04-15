import { IsUUID, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateRefundDto {
  @IsUUID()
  @IsNotEmpty()
  invoiceId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}