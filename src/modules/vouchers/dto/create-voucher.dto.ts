import { IsString, IsNotEmpty, Length, IsNumber, IsDateString } from 'class-validator';

export class CreateVoucherDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  id: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  discount_type: string;

  @IsNumber()
  @IsNotEmpty()
  discount_value: number;

  @IsDateString()
  @IsNotEmpty()
  start_date: string;

  @IsDateString()
  @IsNotEmpty()
  end_date: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  status: string;
}