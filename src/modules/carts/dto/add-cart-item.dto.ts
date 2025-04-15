import { IsUUID, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class AddCartItemDto {
  @IsUUID()
  @IsNotEmpty()
  cartId: string;

  @IsUUID()
  @IsNotEmpty()
  servicePackageId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}