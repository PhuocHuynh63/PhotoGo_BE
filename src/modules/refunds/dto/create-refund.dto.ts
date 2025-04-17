import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateRefundDto {
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'The ID of the invoice to be refunded', example: 123 })
  amount?: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The reason for the refund', example: 'Product defect' })
  reason?: string;
}