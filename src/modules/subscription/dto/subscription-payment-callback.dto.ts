import { IsString, IsOptional, IsBoolean, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionInvoiceStatus } from 'src/constants/subscription.enum';

export class SubscriptionPaymentCallbackDto {

  @ApiProperty({ description: 'ID thanh toán subscription', required: true })
  @IsUUID()
  subscriptionPaymentId: string;

  @ApiProperty({ description: 'ID người dùng', required: false })
  @IsUUID()
  @IsOptional()
  userId?: string;

  // @ApiProperty({ description: 'Loại người thanh toán', required: false, enum: PayerType })
  // @IsEnum(PayerType)
  // @IsOptional()
  // payerType?: PayerType;

  @ApiProperty({ description: 'Trạng thái thanh toán', required: false, enum: SubscriptionInvoiceStatus })
  @IsString()
  @IsOptional()
  @IsEnum(SubscriptionInvoiceStatus)
  status?: SubscriptionInvoiceStatus;

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