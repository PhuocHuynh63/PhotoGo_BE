import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID, IsNumber, IsString, IsNumberString } from 'class-validator';
import { InvoiceSortField, SortDirection } from 'src/constants/invoice.enum';
import { InvoiceStatus } from 'src/constants/payment.enum';

export class FilterInvoiceDto {
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}

export class PaginationInvoiceDto {
  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Trang hiện tại cho phân trang',
    example: '1',
    required: false,
  })
  current?: string;

  @IsNumberString()
  @IsOptional()
  @ApiProperty({
    description: 'Số lượng mục trên mỗi trang',
    example: '10',
    required: false,
  })
  pageSize?: string;

  @IsEnum(InvoiceSortField)
  @IsOptional()
  @ApiProperty({
    description: 'Trường để sắp xếp',
    enum: InvoiceSortField,
    example: InvoiceSortField.ISSUED_AT,
    required: false,
  })
  sortBy?: InvoiceSortField;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Hướng sắp xếp (asc hoặc desc)',
    enum: SortDirection,
    example: 'desc',
    required: false,
  })
  sortDirection?: SortDirection;
}