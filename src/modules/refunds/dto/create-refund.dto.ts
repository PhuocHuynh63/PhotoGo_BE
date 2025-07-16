import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsNumber, IsString, IsOptional, IsObject } from 'class-validator';

export class CreateRefundDto {
  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: 'Số tiền hoàn trả', example: 600000 })
  amount?: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Lý do hoàn trả', example: 'Slot thời gian đã được đặt bởi người khác' })
  reason?: string;

  @IsUUID()
  @IsOptional()
  @ApiProperty({ description: 'ID của payment cần refund', example: 'uuid' })
  paymentId?: string;

  @IsObject()
  @IsOptional()
  @ApiProperty({ description: 'Thông tin giao dịch chi tiết' })
  transactionDetails?: {
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;
    transferId?: string;
    transferTime?: string;
    paymentMethod?: string;
  };
}

export class ManualRefundDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Phương thức hoàn tiền', example: 'BANK_TRANSFER' })
  refundMethod: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'Số tiền hoàn trả', example: 600000 })
  refundAmount: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Ghi chú hoàn tiền', example: 'Đã chuyển tiền về tài khoản VCB' })
  refundNote?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Tài khoản ngân hàng', example: '1234567890' })
  bankAccount?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Tên ngân hàng', example: 'Vietcombank' })
  bankName?: string;
}