import { IsUUID, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BillingCycle, PlanType } from '../../../constants/subscription.enum';
import { Transform } from 'class-transformer';

export class CreateSubscriptionDto {
  @IsUUID()
  @ApiProperty({ description: 'ID của người dùng (có thể null cho vendor subscription)', required: false })
  @IsOptional()
  userId?: string;

  @IsUUID()
  @ApiProperty({ description: 'ID của gói đăng ký' })
  planId: string;

  @IsDateString()
  @ApiProperty({ description: 'Ngày bắt đầu đăng ký' })
  startDate: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty({ description: 'Ngày kết thúc đăng ký (tự động tính nếu không cung cấp)', required: false })
  endDate?: string;

  @IsEnum(PlanType)
  @ApiProperty({ description: 'Loại gói đăng ký', enum: PlanType })
  planType: PlanType; //USER or VENDOR

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