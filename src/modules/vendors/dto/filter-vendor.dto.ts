import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

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
} 