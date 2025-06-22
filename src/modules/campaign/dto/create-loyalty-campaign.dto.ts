import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateLoyaltyCampaignDto {
  @ApiProperty({
    description: 'Tên của loyalty campaign',
    example: 'Gold Member Benefits',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Mô tả chi tiết về loyalty campaign',
    example: 'Chương trình ưu đãi dành cho thành viên Gold',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Cấp độ của loyalty campaign',
    example: 'GOLD',
  })
  @IsString()
  @IsNotEmpty()
  tier: string;

  @ApiProperty({
    description: 'Số điểm cần thiết để đạt được cấp độ này',
    example: 1000,
  })
  @IsNumber()
  @IsNotEmpty()
  pointsRequired: number;

  @ApiProperty({
    description: 'Các quyền lợi của loyalty campaign',
    example: 'Giảm giá 20% cho mọi đơn hàng, Ưu tiên giao hàng, Tặng quà sinh nhật',
    required: false,
  })
  @IsString()
  @IsOptional()
  benefits?: string;
} 