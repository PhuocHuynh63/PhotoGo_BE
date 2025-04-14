import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, Length } from 'class-validator';
import { VendorStatus } from 'src/constants/vendor.enum';

export class CreateVendorDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @ApiProperty({
    description: 'Studio Ánh Sáng',
    example: 'Vendor Name',
  })
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  @ApiProperty({
    example: 'C001',
  })
  category_id: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'Studio chụp ảnh chuyên nghiệp với thiết bị hiện đại',
    description: 'Description of the vendor',
    required: false,
  })
  description?: string;

  @IsEnum(VendorStatus)
  @IsOptional()
  @ApiProperty({
    enum: VendorStatus,
    description: 'Status of the vendor',
    example: VendorStatus.ACTIVE,
    required: false,
  })
  status?: VendorStatus;
}