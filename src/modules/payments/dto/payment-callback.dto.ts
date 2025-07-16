import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentCallbackDto {

  @ApiProperty({ description: 'Trạng thái thanh toán', required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Mã lỗi từ PayOS', required: false })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ description: 'ID giao dịch PayOS', required: false })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ description: 'Xác nhận hủy thanh toán', required: false })
  @IsBoolean()
  @IsOptional()
  cancel?: boolean;

  @ApiProperty({ description: 'Mã đơn hàng', required: false })
  @IsString()
  @IsOptional()
  orderCode?: string;
} 