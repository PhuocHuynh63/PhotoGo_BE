// vendor-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Category } from 'src/modules/categories/entities/category.entity';
import { LocationDto } from 'src/modules/locations/dto/response/location-response.dto';
import { ServicePackageDto } from 'src/modules/service-package/dto/response/package-response.dto';
import { Review } from 'src/modules/reviews/entities/review.entity';
import { User } from 'src/modules/users/entities/user.entity';


export class VendorResponseDto {
  @ApiProperty()
  id: string;

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

  @ApiProperty({ type: () => [Review] })
  reviews: Review[];

  @ApiProperty({ type: () => User })
  user_id: User;

  @ApiProperty({ description: 'Vendor có tham gia campaign với ít nhất 5 user không' })
  isRemarkable: boolean;

  @ApiProperty({ description: 'Vendor có subscription plan giá cao nhất không' })
  priority: boolean;
}
