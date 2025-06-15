import { ApiProperty } from "@nestjs/swagger";
import { IsNumberString, IsOptional } from "class-validator";
import { LocationSortField } from "src/constants/location.enum";

export class PaginationDto {
  @IsNumberString()
  @ApiProperty({
    description: 'Số thứ tự của trang hiện tại',
    example: '1',
    required: false,
  })
  current?: string;

  @IsNumberString()
  @ApiProperty({
    description: 'Số lượng bản ghi trên mỗi trang',
    example: '10',
    required: false,
  })
  pageSize?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Trường để sắp xếp',
    enum: ['createdAt', 'updatedAt', 'name', 'address', 'district', 'ward', 'city', 'province', 'latitude', 'longitude'],
    example: 'createdAt',
    required: false,
  })
  sortBy?: LocationSortField;

  @IsOptional()
  @ApiProperty({
    description: 'Hướng sắp xếp',
    enum: ['asc', 'desc'],
    example: 'asc',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}