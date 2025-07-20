import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OverviewDto {
  @ApiProperty({
    description: 'Start date',
    example: '01/01/2025',
    required: false,
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({
    description: 'End date',
    example: '01/01/2025',
    required: false,
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({
    description: 'Type',
    example: 'finance', 
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({
    description: 'Category',
    example: 'finance',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Status',
    example: 'finance',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;
} 