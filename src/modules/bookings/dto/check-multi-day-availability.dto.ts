import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleDto {
  @ApiProperty({
    description: 'Ngày booking (định dạng DD/MM/YYYY)',
    example: '13/12/2024'
  })
  @IsString()
  date: string;

  // @ApiProperty({
  //   description: 'Ghi chú cho ngày này (tùy chọn)',
  //   example: 'Chụp ảnh cưới',
  //   required: false
  // })
  // @IsOptional()
  // @IsString()
  // notes?: string;
}

export class CheckMultiDayAvailabilityDto {
  @ApiProperty({
    description: 'Danh sách các ngày muốn kiểm tra',
    type: [ScheduleDto],
    example: [
      { date: '13/12/2024' },
      { date: '14/12/2024' },
      { date: '15/12/2024' }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDto)
  schedules: ScheduleDto[];

  @ApiProperty({
    description: 'ID của location',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  locationId: string;

  @ApiProperty({
    description: 'ID của service concept',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsUUID()
  serviceConceptId: string;
}

export class CheckMultiDayAvailabilityResponseDto {
  @ApiProperty({
    description: 'Có thể đặt tất cả các ngày hay không',
    example: false
  })
  isAvailable: boolean;

  @ApiProperty({
    description: 'Danh sách các ngày không khả dụng',
    example: ['14/12/2024']
  })
  unavailableDates: string[];

  @ApiProperty({
    description: 'Lý do không thể đặt (nếu có)',
    example: 'Các ngày sau đã được đặt hoặc không khả dụng: 14/12/2024',
    required: false
  })
  reason?: string;
} 