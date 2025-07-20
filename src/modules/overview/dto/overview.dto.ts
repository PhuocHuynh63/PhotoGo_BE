import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OverviewType } from 'src/constants/overview.enum';

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
    enum: OverviewType,
    description: 'Type',
    example: OverviewType.FINANCE, 
  })
  @IsOptional()
  @IsEnum(OverviewType)
  type?: OverviewType;

  // @ApiProperty({
  //   description: 'Category',
  //   example: 'finance',
  //   required: false,
  // })
  // @IsOptional()
  // @IsString()
  // category?: string;

  // @ApiProperty({
  //   description: 'Status',
  //   example: 'finance',
  //   required: false,
  // })
  // @IsOptional()
  // @IsString()
  // status?: string;
} 