import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BillingCycle, SubscriptionStatus } from '../../../constants/subscription.enum';

export class UpdateSubscriptionDto {
  @IsDateString()
  @IsOptional()
  @ApiProperty({ description: 'Ngày bắt đầu đăng ký', required: false })
  startDate?: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty({ description: 'Ngày kết thúc đăng ký', required: false })
  endDate?: string;

  @IsEnum(SubscriptionStatus)
  @IsOptional()
  @ApiProperty({ 
    description: 'Trạng thái đăng ký',
    enum: SubscriptionStatus,
    required: false
  })
  status?: SubscriptionStatus;

  @IsEnum(BillingCycle)
  @IsOptional()
  @ApiProperty({ 
    description: 'Chu kỳ thanh toán',
    enum: BillingCycle,
    required: false
  })
  billingCycle?: BillingCycle;

  @IsDateString()
  @IsOptional()
  @ApiProperty({ description: 'Ngày thanh toán gần nhất', required: false })
  lastBilledAt?: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty({ description: 'Ngày thanh toán tiếp theo', required: false })
  nextBilledAt?: string;
} 