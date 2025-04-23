// vendor-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Category } from 'src/modules/categories/entities/category.entity';
import { LocationDto } from 'src/modules/locations/dto/response/location-response.dto';
import { ServicePackageDto } from 'src/modules/service-package/dto/response/package-response.dto';


export class VendorResponseDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ nullable: true })
  logo?: string | null;

  @ApiProperty({ nullable: true })
  banner?: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty({ type: () => Category })
  category: Category;

  @ApiProperty({ type: () => [LocationDto] })
  locations: LocationDto[];

  @ApiProperty({ type: () => [ServicePackageDto] })
  servicePackages: ServicePackageDto[];

  @ApiProperty()
  totalPrice: number;

  @ApiProperty() 
  averageRating: number;
}
