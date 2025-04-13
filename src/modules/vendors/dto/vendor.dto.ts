import { IsString, IsNotEmpty, IsEnum, IsOptional, Length } from 'class-validator';
import { VendorStatus } from 'src/constants/vendor.enum';

export class CreateVendorDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  slug: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  category_id: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(VendorStatus)
  @IsOptional()
  status?: VendorStatus;
}