import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CodeVerificationDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Mã code', type: String, required: true })
  code: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'ID người dùng', type: String, required: true })
  userId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'ID vendor', type: String, required: true })
  vendorId: string;
} 