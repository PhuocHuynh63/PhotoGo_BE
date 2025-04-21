import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumberString, IsUUID, IsDate } from 'class-validator';
import { VendorStatus } from 'src/constants/vendor.enum';

export class FindVendorDto {
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
    example: 'Studio Ánh Sáng',
    description: 'Search term for filtering vendors',
    required: false,
  })
  term?: string;

  @IsEnum(VendorStatus)
  @IsOptional()
  @ApiProperty({
    enum: VendorStatus,
    description: 'Status of the vendor',
    example: VendorStatus.ACTIVE,
    required: false,
  })
  status?: VendorStatus;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'created_at',
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

export class VendorManagerFilterDto {
  @IsUUID()
  @IsOptional()
  @ApiProperty({
    example: 'uuid-of-manager',
    description: 'Filter vendors by manager user ID',
    required: false,
  })
  managerUserId?: string;
}

export class VendorLikeFilterDto {
  @IsUUID()
  @IsOptional()
  @ApiProperty({
    example: 'uuid-of-user',
    description: 'Filter vendors liked by a specific user',
    required: false,
  })
  likedByUserId?: string;
}

export class VendorAvailabilityFilterDto {
  @IsDate()
  @IsOptional()
  @ApiProperty({
    example: '2025-04-17',
    description: 'Filter vendors available on a specific date',
    required: false,
  })
  availableDate?: Date;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: '09:00',
    description: 'Filter vendors available starting from this time',
    required: false,
  })
  availableStartTime?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: '18:00',
    description: 'Filter vendors available until this time',
    required: false,
  })
  availableEndTime?: string;
}