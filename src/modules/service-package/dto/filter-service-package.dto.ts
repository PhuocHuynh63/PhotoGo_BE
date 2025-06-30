import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsArray, IsEnum } from 'class-validator';
import { ServicePackageStatus } from 'src/constants/servicePackage.enum';
import { Transform } from 'class-transformer';

export class FilterServicePackageDto {
  @ApiPropertyOptional({ description: 'Tên gói dịch vụ', example: 'Gói chụp ảnh cưới cao cấp' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Giá tối thiểu', type: Number, example: 1000000 })
  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Giá tối đa', type: Number, example: 5000000 })
  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Danh sách ID loại dịch vụ', type: [String], example: ['id1', 'id2'] })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  serviceTypeIds?: string[];

  @ApiPropertyOptional({ description: 'Trạng thái', enum: ServicePackageStatus, example: ServicePackageStatus.ACTIVE, default: ServicePackageStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ServicePackageStatus)
  status?: ServicePackageStatus;

  @ApiPropertyOptional({ description: 'Trang hiện tại', type: Number, example: 1 })
  @IsOptional()
  @IsNumber()
  current?: number;

  @ApiPropertyOptional({ description: 'Kích thước trang', type: Number, example: 10 })
  @IsOptional()
  @IsNumber()
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Sắp xếp theo', enum: ['name', 'price', 'created_at'], example: 'price' })
  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'price' | 'created_at';

  @ApiPropertyOptional({ description: 'Thứ tự sắp xếp', enum: ['asc', 'desc'], example: 'asc' })
  @IsOptional()
  @IsString()
  sortDirection?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Hiển thị tất cả', type: String, example: 'false', required: false })
  @IsOptional()
  showAll?: string;
}