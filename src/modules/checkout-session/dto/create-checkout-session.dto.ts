import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCheckoutSessionDto {
  @ApiProperty({ example: 'vendor-123', description: 'Nhà cung cấp ID' })
  @IsString()
  @IsNotEmpty()
  vendorId: string;

  @ApiProperty({ example: 'package-456', description: 'Gói dịch vụ ID' })
  @IsString()
  @IsNotEmpty()
  servicePackageId: string;

  @ApiProperty({ example: '2024-03-20T14:00:00Z', description: 'Thời gian chọn' })
  @IsDateString()
  @IsNotEmpty()
  selectedTime: string;

  @ApiProperty({ example: 1000000, description: 'Tổng giá trị gói dịch vụ' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalPrice: number;

  @ApiProperty({ example: 2, description: 'Số giờ dịch vụ' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  duration: number;

  @ApiProperty({ example: 'Ghi chú khách hàng', description: 'Ghi chú dịch vụ', required: false })
  @IsString()
  @IsOptional()
  note?: string;
} 