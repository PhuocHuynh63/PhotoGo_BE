import { ApiProperty } from '@nestjs/swagger';
import { ServicePackageStatus } from 'src/constants/servicePackage.enum';

export class ServiceTypeDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Chụp ảnh cưới' })
  name: string;

  @ApiProperty({ example: 'Dịch vụ chụp ảnh cưới chuyên nghiệp' })
  description?: string;
}

export class ServiceConceptDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Chụp ảnh cưới cơ bản' })
  name: string;

  @ApiProperty({ example: 'Gói chụp ảnh cưới cơ bản với 100 ảnh' })
  description?: string;

  @ApiProperty({ example: 1000000 })
  price: number;

  @ApiProperty({ example: 60 })
  duration: number; // Duration in minutes

  @ApiProperty({ type: [String], example: ["https://example.com/image1.png", "https://example.com/image2.png"] })
  images: string[];

  @ApiProperty({ type: [ServiceTypeDto] })
  serviceTypes: ServiceTypeDto[];
}

export class ServicePackageDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  vendorId: string;

  @ApiProperty({ example: 'Gói dịch vụ cơ bản' })
  name: string;

  @ApiProperty({ example: 'Mô tả gói dịch vụ cơ bản' })
  description?: string;

  @ApiProperty({ example: 'https://example.com/logo.png' })
  logo?: string;

  @ApiProperty({ enum: ServicePackageStatus, example: ServicePackageStatus.ACTIVE })
  status: ServicePackageStatus;

  @ApiProperty({ type: [ServiceConceptDto] })
  serviceConcepts: ServiceConceptDto[];

  @ApiProperty({ example: '2024-03-20T00:00:00Z' })
  created_at: Date;

  @ApiProperty({ example: '2024-03-20T00:00:00Z' })
  updated_at: Date;
}