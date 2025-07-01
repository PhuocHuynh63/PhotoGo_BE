import { ServicePackageStatus } from 'src/constants/servicePackage.enum';

export class ServiceTypeResponseDto {
  id: string;
  name: string;
  description: string;
}

export class ServiceConceptResponseDto {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  images: string[];
  serviceTypes: ServiceTypeResponseDto[];
}

export class VendorResponseDto {
  id: string;
  name: string;
  description: string;
  logo: string;
  status: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  locations: LocationResponseDto[];
}

export class LocationResponseDto {
  id: string;
  address: string;
  district: string;
  ward: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
}

export class FilteredServicePackageResponseDto {
  id: string;
  name: string;
  description: string;
  image: string;
  status: ServicePackageStatus;
  createdAt: Date;
  updatedAt: Date;
  minPrice: number | null;
  maxPrice: number | null;
  vendor: VendorResponseDto;
  serviceConcepts: ServiceConceptResponseDto[];
}

export class PaginatedFilteredServicePackageResponseDto {
  data: FilteredServicePackageResponseDto[];
  pagination: {
    current: number;
    pageSize: number;
    totalPage: number;
    totalItem: number;
  };
} 