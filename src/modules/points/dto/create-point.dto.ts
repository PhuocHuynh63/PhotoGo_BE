import { IsString, IsNotEmpty, IsNumber, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { PointTransactionType } from 'src/constants/point.enum';

export class CreatePointDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsNumber()
  @IsNotEmpty()
  balance: number;
}

export class CreatePointTransactionDto {
  @IsUUID()
  @IsNotEmpty()
  pointId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsEnum(PointTransactionType)
  @IsNotEmpty()
  type: PointTransactionType;

  @IsOptional()
  @IsString()
  description?: string;
}
