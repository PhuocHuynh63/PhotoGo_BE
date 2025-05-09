import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max, IsNumberString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { VendorSortField } from 'src/constants/vendor.enum';



export class FilterVendorDto {
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Location search term',
    example: 'Thủ Đức',
    required: false,
  })
  location?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({
    description: 'Minimum price',
    example: 1000000,
    required: false,
  })
  minPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({
    description: 'Maximum price',
    example: 5000000,
    required: false,
  })
  maxPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  @ApiProperty({
    description: 'Minimum rating (0-5)',
    example: 4,
    required: false,
  })
  minRating?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  @ApiProperty({
    description: 'Maximum rating (0-5)',
    example: 5,
    required: false,
  })
  maxRating?: number;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Page number for pagination',
    example: '1',
    required: false,
  })
  current?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Number of items per page',
    example: '10',
    required: false,
  })
  pageSize?: string;

  @IsEnum(VendorSortField)
  @IsOptional()
  @ApiProperty({
    description: 'Field to sort by',
    enum: VendorSortField,
    example: VendorSortField.CREATED_AT,
    required: false,
  })
  sortBy?: VendorSortField;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Sort direction (asc or desc)',
    example: 'desc',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
} 