import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateInvoiceDto {

  @IsDateString()
  @IsOptional()
  @ApiProperty({ description: 'Ngày phát hành hóa đơn', example: '2025-04-23' })
  issuedAt?: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty({ description: 'Ngày cập nhật hóa đơn', example: '2025-04-30' })
  updatedAt?: string;
}