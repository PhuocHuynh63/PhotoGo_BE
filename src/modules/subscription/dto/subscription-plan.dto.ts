import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BillingCycle, PlanType } from '../../../constants/subscription.enum';

export class CreateSubscriptionPlanDto {
  @IsString()
  @ApiProperty({ description: 'Tên gói đăng ký' })
  name: string;

  @IsString()
  @ApiProperty({ description: 'Mô tả gói đăng ký' })
  description: string;

  @IsNumber()
  @ApiProperty({ description: 'Giá gói đăng ký' })
  price: number;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ description: 'Trạng thái hoạt động', default: true })
  isActive?: boolean = true;

  @IsEnum(PlanType)
  @ApiProperty({ description: 'Loại gói đăng ký', enum: PlanType })
  planType: PlanType;

  @IsEnum(BillingCycle)
  @ApiProperty({ description: 'Chu kỳ thanh toán', enum: BillingCycle })
  billingCycle: BillingCycle;
}

export class UpdateSubscriptionPlanDto {
  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Tên gói đăng ký', required: false })
  name?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Mô tả gói đăng ký', required: false })
  description?: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: 'Giá gói đăng ký', required: false })
  price?: number;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ description: 'Trạng thái hoạt động', required: false })
  isActive?: boolean;

  @IsEnum(PlanType)
  @IsOptional()
  @ApiProperty({ description: 'Loại gói đăng ký', enum: PlanType, required: false })
  planType?: PlanType;

  @IsEnum(BillingCycle)
  @IsOptional()
  @ApiProperty({ description: 'Chu kỳ thanh toán', enum: BillingCycle, required: false })
  billingCycle?: BillingCycle;
}

export class FindSubscriptionPlanDto {
  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Tìm kiếm theo tên', required: false })
  name?: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ description: 'Lọc theo trạng thái hoạt động', required: false })
  isActive?: boolean;

  @IsEnum(PlanType)
  @IsOptional()
  @ApiProperty({ description: 'Loại gói đăng ký', enum: PlanType, required: false })
  planType?: PlanType;
} 