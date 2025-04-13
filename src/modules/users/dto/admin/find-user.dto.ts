import { ApiProperty, ApiQuery } from "@nestjs/swagger";
import { IsOptional, IsString, Matches } from "class-validator";

@ApiQuery({ required: false })
export class FindUserDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'Thuan',
    description: 'Full name, phone number, or email of the user',
    required: false,
  })
  term?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'active',
    description: 'Status of the user account (e.g., active, inactive)',
    required: false,
  })
  status?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'Unrank',
    description: 'Rank of the user (e.g., Unrank, Bronze, Silver)',
    required: false,
  })
  rank?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'local',
    description: 'Authentication method (e.g., local, google, facebook)',
    required: false,
  })
  auth?: string;

  @IsOptional()
  @ApiProperty({
    example: '1',
    description: 'Current page number',
    required: false,
  })
  current?: string = '1';

  @ApiProperty({
    example: '10',
    description: 'Number of items per page',
    required: false,
  })
  @IsOptional()
  pageSize?: string = '10';

  @IsOptional()
  @IsString()
  @Matches(/^(createdAt|updatedAt|fullName|email|phoneNumber|status|rank)$/)
  @ApiProperty({
    example: 'createdAt',
    description: 'Field to sort by (e.g., createdAt, updatedAt, fullName, email, phoneNumber, status, rank)',
    required: false,
  })
  sortBy?: string = 'createdAt';

  @IsOptional()
  @Matches(/^(asc|desc)$/)
  @ApiProperty({
    example: 'desc',
    description: 'Sort direction (asc or desc)',
    required: false,
  })
  sortDirection?: 'asc' | 'desc' = 'desc';
}