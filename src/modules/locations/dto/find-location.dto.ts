import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumberString, IsEnum, IsBoolean } from 'class-validator';
import { LocationSortField } from 'src/constants/location.enum';

export class FindLocationDto {
  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Số thứ tự của trang hiện tại',
    example: '1',
    required: false,
  })
  current?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Số lượng bản ghi trên mỗi trang',
    example: '10',
    required: false,
  })
  pageSize?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Tìm kiếm theo từ khóa',
    example: 'keyword',
    required: false,
  })
  term?: string;

  @IsEnum(LocationSortField)
  @IsOptional()
  @ApiProperty({
    description: 'Trường để sắp xếp',
    enum: LocationSortField,
    example: LocationSortField.CREATED_AT,
    required: false,
  })
  sortBy?: LocationSortField;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Hướng sắp xếp',
    example: 'asc',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}

export class FindLocationAvailabilityDto {

  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    description: 'Trạng thái sẵn sàng',
    example: true,
    required: false,
  })
  isAvailable?: boolean;
  
  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Số thứ tự của trang hiện tại',
    example: '1',
    required: false,
  })
  current?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Số lượng bản ghi trên mỗi trang',
    example: '10',
    required: false,
  })
  pageSize?: string;

  @IsEnum(LocationSortField)
  @IsOptional()
  @ApiProperty({
    description: 'Trường để sắp xếp',
    enum: LocationSortField,
    example: LocationSortField.CREATED_AT,
    required: false,
  })
  sortBy?: LocationSortField;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Hướng sắp xếp',
    example: 'asc',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}