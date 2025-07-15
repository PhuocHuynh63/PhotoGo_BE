import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

  @IsNumber()
  @ApiProperty({ description: 'Thời hạn gói đăng ký (ngày)' })
  duration: number;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ description: 'Trạng thái hoạt động', default: true })
  isActive?: boolean = true;
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

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: 'Thời hạn gói đăng ký (ngày)', required: false })
  duration?: number;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ description: 'Trạng thái hoạt động', required: false })
  isActive?: boolean;
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
} 