import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BillingCycle, PlanType } from '../../../constants/subscription.enum';
import { Transform } from 'class-transformer';

export class PaginationSubscriptionPlanDto {
  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: 'Trang hiện tại', required: false, default: 1 })
  current?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: 'Số lượng item trên mỗi trang', required: false, default: 10 })
  pageSize?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Sắp xếp theo trường', required: false, default: 'createdAt', enum: ['createdAt', 'updatedAt', 'name', 'priceForMonth', 'priceForYear', 'planType', 'billingCycle'] })
  sortBy?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Hướng sắp xếp', required: false, default: 'DESC', enum: ['ASC', 'DESC'] })
  sortDirection?: string;
}

export class CreateSubscriptionPlanDto {
  @IsString()
  @ApiProperty({ description: 'Tên gói đăng ký' })
  name: string;

  @IsString()
  @ApiProperty({ description: 'Mô tả gói đăng ký' })
  description: string;

  @IsNumber()
  @ApiProperty({ description: 'Giá gói đăng ký theo tháng' })
  priceForMonth: number;

  @IsNumber()
  @ApiProperty({ description: 'Giá gói đăng ký theo năm' })
  priceForYear: number;

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
  @ApiProperty({ description: 'Giá gói đăng ký theo tháng', required: false })
  priceForMonth?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: 'Giá gói đăng ký theo năm', required: false })
  priceForYear?: number;

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

export class FindSubscriptionPlanDto extends PaginationSubscriptionPlanDto {
  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Tìm kiếm theo tên', required: false })
  name?: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ description: 'Lọc theo trạng thái hoạt động', required: false, default: false })
  // @Transform(({ value }) => {
  //   if(typeof value === 'boolean') return value;
  //   if(typeof value === 'string') {
  //     if(value.toLowerCase() === 'true' || value.toLowerCase() === '1') return true;
  //     if(value.toLowerCase() === 'false' || value.toLowerCase() === '0') return false;
  //   }
  //   console.log('DEBUG DTO isActive raw:', value, typeof value);
  //   return undefined;
  // })
  isActive?: boolean;

  @IsEnum(PlanType)
  @IsOptional()
  @ApiProperty({ description: 'Loại gói đăng ký', enum: PlanType, required: false })
  planType?: PlanType;
}

