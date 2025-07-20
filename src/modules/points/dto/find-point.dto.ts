import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumberString, IsUUID, IsDateString } from 'class-validator';

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
    example: 'balance',
    description: 'Trường để sắp xếp',
    required: false,
    enum: ['created_at', 'updated_at', 'balance', 'user.email', 'user.full_name'],
  })
  sortBy?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    enum: ['asc', 'desc'],
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
    enum: ['asc', 'desc'],
    example: 'asc',
    description: 'Sort direction (asc or desc)',
    required: false,
  })
  sortDirection?: 'asc' | 'desc';
}

export class FindMyPointHistoryDto extends FindMyTransactionsDto {
  @IsDateString()
  @IsOptional()
  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Ngày bắt đầu để lọc giao dịch',
    required: false,
  })
  startDate?: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty({
    example: '2024-12-31T23:59:59.999Z',
    description: 'Ngày kết thúc để lọc giao dịch',
    required: false,
  })
  endDate?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '100',
    description: 'Số điểm tối thiểu (dựa trên giá trị tuyệt đối, bất kể cộng hay trừ)',
    required: false,
  })
  minAmount?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    example: '1000',
    description: 'Số điểm tối đa (dựa trên giá trị tuyệt đối, bất kể cộng hay trừ)',
    required: false,
  })
  maxAmount?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'positive',
    description: 'Lọc theo hướng thay đổi điểm',
    required: false,
    enum: ['positive', 'negative', 'all'],
  })
  direction?: 'positive' | 'negative' | 'all';
}