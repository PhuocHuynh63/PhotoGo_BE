import { IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateSubscriptionPlanDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  id: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  name: string;

  @IsString()
  @Length(0, 255)
  description?: string;
}