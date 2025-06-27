import { IsUUID, IsDateString, IsEnum, IsOptional, IsEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BillingCycle } from '../../../constants/subscription.enum';
import { Transform } from 'class-transformer';

export class CreateSubscriptionDto {
  @IsUUID()
  @ApiProperty({ description: 'ID của người dùng', required: false })
  @IsOptional()
  userId?: string;

  @IsString()
  @Length(1, 10)
  @ApiProperty({ description: 'ID của gói đăng ký' })
  planId: string;

  @IsUUID()
  @ApiProperty({ description: 'ID của nhà cung cấp' })
  vendorId: string;

  @IsDateString()
  @ApiProperty({ description: 'Ngày bắt đầu đăng ký' })
  startDate: string;

  @IsDateString()
  @ApiProperty({ description: 'Ngày kết thúc đăng ký' })
  endDate: string;

  @IsEnum(BillingCycle)
  @ApiProperty({ 
    description: 'Chu kỳ thanh toán',
    enum: BillingCycle,
    default: BillingCycle.MONTHLY
  })
  billingCycle: BillingCycle;

  @IsDateString()
  @IsOptional()
  @ApiProperty({ description: 'Ngày thanh toán gần nhất', required: false })
  lastBilledAt?: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty({ description: 'Ngày thanh toán tiếp theo', required: false })
  nextBilledAt?: string;
} 