import { IsUUID, IsDate, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionVendorDto {
  @ApiProperty({ description: 'ID của subscription plan' })
  @IsUUID()
  planId: string;

  @ApiProperty({ description: 'ID của vendor' })
  @IsUUID()
  vendorId: string;

  @ApiProperty({ description: 'Ngày vendor tham gia (tự động set nếu không cung cấp)', required: false })
  @IsOptional()
  @IsDate()
  joinedDate?: Date;

  @ApiProperty({ description: 'Ngày vendor kết thúc (tùy chọn)', required: false })
  @IsOptional()
  @IsDate()
  endedDate?: Date;

  @ApiProperty({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSubscriptionVendorDto {
  @ApiProperty({ description: 'Ngày vendor tham gia', required: false })
  @IsOptional()
  @IsDate()
  joinedDate?: Date;

  @ApiProperty({ description: 'Ngày vendor kết thúc', required: false })
  @IsOptional()
  @IsDate()
  endedDate?: Date;

  @ApiProperty({ description: 'Trạng thái hoạt động', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SubscriptionVendorResponseDto {
  @ApiProperty({ description: 'ID của subscription vendor' })
  id: string;

  @ApiProperty({ description: 'ID của subscription plan' })
  planId: string;

  @ApiProperty({ description: 'ID của vendor' })
  vendorId: string;

  @ApiProperty({ description: 'Ngày vendor tham gia' })
  joinedDate: Date;

  @ApiProperty({ description: 'Ngày vendor kết thúc' })
  endedDate?: Date;

  @ApiProperty({ description: 'Trạng thái hoạt động' })
  isActive: boolean;

  @ApiProperty({ description: 'Ngày tạo' })
  createdAt: Date;

  @ApiProperty({ description: 'Ngày cập nhật' })
  updatedAt: Date;
} 