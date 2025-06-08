import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLocationSlotTimeDto {
  @ApiProperty({ 
    required: false,
    description: 'Nếu true, không cho phép đặt lịch trùng giờ',
    default: true 
  })
  @IsBoolean()
  @IsOptional()
  isStrictTimeBlocking?: boolean;

  @ApiProperty({ 
    required: false,
    description: 'Số lượng booking tối đa cho phép trong cùng một slot',
    minimum: 1,
    maximum: 10,
    default: 1
  })
  @IsInt()
  @Min(1, { message: 'Số lượng booking tối đa phải lớn hơn 0' })
  @Max(10, { message: 'Số lượng booking tối đa không được vượt quá 10' })
  @Type(() => Number)
  @IsOptional()
  maxParallelBookings?: number;
} 