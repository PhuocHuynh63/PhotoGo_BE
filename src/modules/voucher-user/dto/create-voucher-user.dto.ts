import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { VoucherUserStatusEnum } from 'src/constants/voucher.enum';

export class CreateVoucherUserDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  voucher_id: string;

  @IsOptional()
  @IsEnum(VoucherUserStatusEnum)
  status // Optional field, default to 'available' if not provided
}