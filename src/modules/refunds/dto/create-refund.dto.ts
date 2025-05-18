import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateRefundDto {
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'ID của hóa đơn cần được hoàn trả', example: 123 })
  amount?: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Lý do hoàn trả', example: 'Sản phẩm lỗi' })
  reason?: string;
}