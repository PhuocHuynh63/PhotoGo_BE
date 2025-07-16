import { ApiProperty } from '@nestjs/swagger';
import { ServiceTypeStatus } from 'src/constants/serviceType.enum';

export class ServiceTypeResponseDto {
  @ApiProperty({
    description: 'ID của loại dịch vụ',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Tên loại dịch vụ',
    example: 'Chụp ảnh cưới'
  })
  name: string;

  @ApiProperty({
    description: 'Mô tả loại dịch vụ',
    example: 'Dịch vụ chụp ảnh cưới chuyên nghiệp',
    nullable: true
  })
  description: string;

  @ApiProperty({
    description: 'Trạng thái của loại dịch vụ',
    enum: ServiceTypeStatus,
    example: ServiceTypeStatus.ACTIVE
  })
  status: ServiceTypeStatus;

  @ApiProperty({
    description: 'Số lượng concept sử dụng loại dịch vụ này',
    example: 5
  })
  conceptCount: number;

  @ApiProperty({
    description: 'Số lượng package sử dụng loại dịch vụ này',
    example: 3
  })
  packageCount: number;

  @ApiProperty({
    description: 'Thời gian tạo',
    example: '2024-01-01T00:00:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Thời gian cập nhật cuối',
    example: '2024-01-01T00:00:00.000Z'
  })
  updatedAt: Date;
}

export class PaginatedServiceTypeResponseDto {
  @ApiProperty({
    description: 'Danh sách loại dịch vụ',
    type: [ServiceTypeResponseDto]
  })
  data: ServiceTypeResponseDto[];

  @ApiProperty({
    description: 'Thông tin phân trang',
    example: {
      current: 1,
      pageSize: 10,
      totalPage: 5,
      totalItem: 50
    }
  })
  pagination: {
    current: number;
    pageSize: number;
    totalPage: number;
    totalItem: number;
  };
} 