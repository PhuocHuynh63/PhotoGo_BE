import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, Min } from "class-validator";

export class PaginationDto {
  @ApiProperty({
    description: 'Số trang hiện tại',
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  current?: number = 1;

  @ApiProperty({
    description: 'Số lượng item trên mỗi trang',
    default: 10,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  pageSize?: number = 10;
}