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