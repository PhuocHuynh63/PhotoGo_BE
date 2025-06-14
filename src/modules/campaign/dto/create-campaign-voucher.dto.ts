import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateCampaignVoucherDto {
  @ApiProperty({
    description: 'Trạng thái khả dụng của voucher trong campaign',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean = true;
} 

export class CreateMultipleCampaignVoucherDto {
    @ApiProperty({
      description: 'Danh sách ID của các voucher',
      type: [String],
      example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001']
    })
    @IsOptional()
    @Transform(({ value }) => {
      if (typeof value === 'string') {
        return value.split(',').map(id => id.trim());
      }
      return value;
    })
    @IsArray({ message: 'Danh sách voucher phải là một mảng' })
    @IsUUID('4', { each: true })
    voucherIds: string[];
  } 