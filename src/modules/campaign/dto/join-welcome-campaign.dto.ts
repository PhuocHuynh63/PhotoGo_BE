import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class JoinWelcomeCampaignDto {
  @ApiProperty({
    description: 'ID của user muốn thêm vào campaign',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Ghi chú khi thêm user vào campaign (tùy chọn)',
    example: 'User mới đăng ký',
    required: false
  })
  @IsString()
  @IsOptional()
  note?: string;
} 