import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, Matches, IsNotEmpty } from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({
    description: 'Tên của campaign',
    example: 'Summer Sale 2024',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Mô tả chi tiết về campaign',
    example: 'Chương trình khuyến mãi mùa hè với nhiều ưu đãi hấp dẫn',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Ngày bắt đầu campaign (định dạng DD/MM/YYYY)',
    example: '01/06/2024',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, {
    message: 'Date must be in DD/MM/YYYY format',
  })
  startDate: string;

  @ApiProperty({
    description: 'Ngày kết thúc campaign (định dạng DD/MM/YYYY)',
    example: '31/08/2024',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, {
    message: 'Date must be in DD/MM/YYYY format',
  })
  endDate: string;

  // @ApiProperty({
  //   description: 'Trạng thái của campaign',
  //   example: true,
  //   default: true,
  // })
  // @IsBoolean()
  // @IsOptional()
  // status?: boolean = true;
} 