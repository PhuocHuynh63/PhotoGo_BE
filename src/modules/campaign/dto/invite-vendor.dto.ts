import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class InviteVendorDto {
  @ApiProperty({ description: 'ID của campaign' })
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @ApiProperty({ description: 'ID của vendor' })
  @IsString()
  @IsNotEmpty()
  vendorId: string;
} 