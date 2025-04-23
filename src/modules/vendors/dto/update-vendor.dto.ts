import { IsOptional } from 'class-validator';
import { VendorStatus } from 'src/constants/vendor.enum';

export class UpdateVendorDto {
    @IsOptional()
    name?: string;
  
    @IsOptional()
    description?: string;
  
    @IsOptional()
    status?: VendorStatus;
  }
  