import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ConfirmVendorInviteDto {
  @ApiProperty({ description: 'Token xác nhận' })
  @IsString()
  @IsNotEmpty()
  token: string;
} 