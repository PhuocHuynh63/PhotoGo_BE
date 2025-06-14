import { ApiProperty } from '@nestjs/swagger';

export class VoucherInfoDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'SUMMER2024' })
  code: string;

  @ApiProperty({ example: 'Giảm giá mùa hè' })
  description: string;

  @ApiProperty({ example: 'percentage' })
  discount_type: string;

  @ApiProperty({ example: 10 })
  discount_value: number;

  @ApiProperty({ example: 100000 })
  minPrice: number;

  @ApiProperty({ example: 1000000 })
  maxPrice: number;

  @ApiProperty({ example: 100 })
  quantity: number;

  @ApiProperty({ example: 50 })
  usedCount: number;

  @ApiProperty({ example: 1000 })
  point: number;
}

export class UserInfoDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  fullName: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: '0123456789' })
  phoneNumber: string;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ example: 'gold' })
  rank: string;
}

export class CampaignResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Summer Campaign 2024' })
  name: string;

  @ApiProperty({ example: true })
  status: boolean;

  @ApiProperty({ type: [VoucherInfoDto] })
  vouchers: VoucherInfoDto[];

  @ApiProperty({ type: [UserInfoDto] })
  users: UserInfoDto[];
} 