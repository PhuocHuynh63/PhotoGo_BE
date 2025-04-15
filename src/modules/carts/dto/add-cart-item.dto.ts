import { IsUUID, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class AddCartItemDto {

  @IsUUID()
  @IsNotEmpty()
  userId: string;

}