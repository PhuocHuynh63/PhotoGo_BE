import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Min } from "class-validator";

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

  @ApiProperty({
    description: 'Sắp xếp theo trường nào',
    enum: ['createdAt', 'updatedAt', 'date', 'time', 'status', 'sourceType', 'sourceId', 'depositAmount'],
    default: 'createdAt',
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Sắp xếp theo hướng nào',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsString()
  @IsOptional()
  sortDirection?: string = 'DESC';
}