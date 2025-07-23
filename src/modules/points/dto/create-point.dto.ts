import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { PointTransactionType } from 'src/constants/point.enum';

export class CreatePointDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID của người dùng',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  user_id: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Số dư điểm',
    example: 100,
  })
  balance: number;
}

export class CreatePointTransactionDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID của điểm',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  pointId: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Số lượng điểm',
    example: 100,
  })
  amount: number;

  @IsEnum(PointTransactionType)
  @IsNotEmpty()
  @ApiProperty({
    description: 'Loại giao dịch',
    enum: PointTransactionType,
    example: PointTransactionType.EARN,
  })
  type: PointTransactionType;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Mô tả',
    example: 'Nhận điểm từ đơn hàng',
  })
  description?: string;
}

export class ChangePointsDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID của user cần thay đổi điểm',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Số điểm thay đổi (dương: cộng, âm: trừ)',
    example: 100,
  })
  amount: number;

  @IsEnum(PointTransactionType)
  @IsNotEmpty()
  @ApiProperty({
    description: 'Loại giao dịch',
    enum: PointTransactionType,
    example: PointTransactionType.EARN,
  })
  type: PointTransactionType;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Mô tả lý do thay đổi điểm',
    example: 'Thưởng sự kiện',
    required: false,
  })
  description?: string;
}
