import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumberString , IsUUID} from 'class-validator';

export class FindPointDto {
  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '1',
    description: 'Số trang hiện tại',
    required: false,
  })
  current?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '10',
    description: 'Số lượng bản ghi trên mỗi trang',
    required: false,
  })
  pageSize?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Từ khóa tìm kiếm',
    required: false,
  })
  term?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'user_id',
    description: 'ID của người dùng để lọc điểm',
    required: false,
  })
  sortBy?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'asc',
    description: 'Sort direction (asc or desc)',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}

export class FindPointTransactionDto {
  @IsUUID()
  @IsOptional()
  pointId?: string;
}

export class FindMyTransactionsDto {
  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '1',
    description: 'Số trang hiện tại',
    required: false,
  })
  current?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '10',
    description: 'Số lượng bản ghi trên mỗi trang',
    required: false,
  })
  pageSize?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'kiếm được',
    description: 'Loại giao dịch (kiếm được, đổi thưởng, hết hạn)',
    required: false,
    enum: ['kiếm được', 'đổi thưởng', 'hết hạn'],
  })
  type?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'asc',
    description: 'Sort direction (asc or desc)',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}