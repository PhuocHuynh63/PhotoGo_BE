import { ApiProperty, ApiQuery } from "@nestjs/swagger";
import { IsOptional, IsString, Matches } from "class-validator";

@ApiQuery({ required: false })
export class FindAllUserDto {
  @IsOptional()
  @IsString()
  term?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  rank?: string;

  @IsOptional()
  @IsString()
  auth?: string;

  @IsOptional()
  current?: string = '1';

  @IsOptional()
  pageSize?: string = '10';

  @IsOptional()
  @IsString()
  @Matches(/^(createdAt|updatedAt|fullName|email|phoneNumber|status|rank)$/)
  sortBy?: string = 'createdAt';

  @IsOptional()
  @Matches(/^(asc|desc)$/)
  sortDirection?: 'asc' | 'desc' = 'desc';
}