import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumberString, IsEnum, IsBoolean, IsNotEmpty, Matches } from 'class-validator';
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
    enum: ['asc', 'desc'],
    example: 'asc',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}

export class FindLocationDateRangeDto extends FindLocationAvailabilityDto {
  @ApiProperty({
      description: 'Ngày bắt đầu',
      example: '08/06/2025',
      required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, {
      message: 'startDate phải có định dạng DD/MM/YYYY'
  })
  startDate: string;

  @ApiProperty({
      description: 'Ngày kết thúc',
      example: '12/06/2025',
      required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, {
      message: 'endDate phải có định dạng DD/MM/YYYY'
  })
  endDate: string;
} 

export class FindLocationAvailabilityWithDateDto {
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Ngày',
    example: '08/06/2025',
    required: true,
  })
  date?: string;

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
    enum: ['asc', 'desc'],
    example: 'asc',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}