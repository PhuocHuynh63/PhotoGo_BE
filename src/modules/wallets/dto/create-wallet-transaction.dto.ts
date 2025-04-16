import { IsUUID, IsNotEmpty, IsNumber, IsEnum, IsString } from 'class-validator';
import { WalletTransactionType } from '../../../constants/wallet.enum';

export class CreateWalletTransactionDto {
  @IsUUID()
  @IsNotEmpty()
  walletId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsEnum(WalletTransactionType)
  @IsNotEmpty()
  type: WalletTransactionType;

  @IsString()
  @IsNotEmpty()
  description: string;
}