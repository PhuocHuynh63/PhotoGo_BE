import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty } from "class-validator";

export class UpdateLocationWorkingDateStatusDto {
  @ApiProperty({
    description: 'Trạng thái ngày làm việc',
    example: true,
    required: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isAvailable: boolean;
}