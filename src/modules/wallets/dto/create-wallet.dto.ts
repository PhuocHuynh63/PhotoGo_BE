import { IsUUID, IsNotEmpty } from 'class-validator';

export class CreateWalletDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}