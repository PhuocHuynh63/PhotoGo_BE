import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumberString, IsUUID } from 'class-validator';

export class FindTeamMemberDto {
  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '1',
    description: 'Số trang cho phân trang',
    required: false,
  })
  current?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '10',
    description: 'Số mục trên mỗi trang cho phân trang',
    required: false,
  })
  pageSize?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Từ tìm kiếm để lọc thành viên đội',
    required: false,
  })
  term?: string;

  @IsUUID()
  @IsOptional()
  @ApiProperty({
    example: 'uuid của location',
    description: 'ID của cửa hàng để lọc thành viên đội',
    required: false,
  })
  location_id?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'V001',
    description: 'ID của nhà cung cấp để lọc thành viên đội',
    required: false,
  })
  sortBy?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'asc',
    description: 'Hướng sắp xếp (asc hoặc desc)',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}