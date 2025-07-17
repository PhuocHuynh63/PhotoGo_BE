import { IsOptional, IsEnum, IsUUID, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionStatus, PlanType } from '../../../constants/subscription.enum';
import { Type } from 'class-transformer';

export class FindSubscriptionDto {
  @IsOptional()
  @IsUUID()
  @ApiProperty({ description: 'ID của người dùng', required: false })
  userId?: string;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  @ApiProperty({ 
    description: 'Trạng thái đăng ký',
    enum: SubscriptionStatus,
    required: false
  })
  status?: SubscriptionStatus;

  @IsEnum(PlanType)
  @IsOptional()
  @ApiProperty({ description: 'Loại gói đăng ký', enum: PlanType, required: false })
  planType?: PlanType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({ description: 'Trang hiện tại', required: false })
  current?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({ description: 'Số lượng item trên mỗi trang', required: false })
  pageSize?: number;
} 