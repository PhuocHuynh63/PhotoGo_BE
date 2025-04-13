import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreatePointDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsNumber()
  @IsNotEmpty()
  balance: number;
}