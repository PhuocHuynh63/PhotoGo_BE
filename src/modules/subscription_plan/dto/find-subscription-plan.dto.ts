import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumberString } from 'class-validator';

export class FindSubscriptionPlanDto {
  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '1',
    description: 'Page number for pagination',
    required: false,
  })
  current?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '10',
    description: 'Number of items per page for pagination',
    required: false,
  })
  pageSize?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'basic',
    description: 'Search term for filtering subscription plans',
    required: false,
  })
  term?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'id',
    description: 'Field to sort by',
    required: false,
  })
  sortBy?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'asc',
    description: 'Sort direction (asc or desc)',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}