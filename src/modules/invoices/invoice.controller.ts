import { Controller, Post, Get, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { FindAllInvoicesDto } from './dto/find-all.dto';
import { Invoice } from './entities/invoice.entity';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ApiTags, ApiBearerAuth, ApiOperation , ApiResponse } from '@nestjs/swagger';

@Controller('invoices')
@ApiTags('Invoice')
@ApiBearerAuth('access-token')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo hóa đơn mới' })
  @ApiResponse({ status: 201, description: 'Hóa đơn được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async create(@Query('bookingId') bookingId: string,
               @Query('voucherId') voucherId: string,
               @Body() createInvoiceDto: CreateInvoiceDto) {
    return await this.invoiceService.create(bookingId,voucherId,createInvoiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả hóa đơn' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả hóa đơn', type: [CreateInvoiceDto] })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hóa đơn' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  async findAll(@Query() query: FindAllInvoicesDto) {
    return await this.invoiceService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy hóa đơn theo ID' })
  @ApiResponse({ status: 200, description: 'Hóa đơn được tìm thấy', type: CreateInvoiceDto })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hóa đơn' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  async findOne(@Param('id') id: string) {
    return await this.invoiceService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật hóa đơn theo ID' })
  @ApiResponse({ status: 200, description: 'Hóa đơn được cập nhật thành công', type: UpdateInvoiceDto })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hóa đơn' })
  async updateInvoice(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto): Promise<Invoice> {
    return await this.invoiceService.updateInvoice(id, updateInvoiceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa hóa đơn theo ID' })
  @ApiResponse({ status: 200, description: 'Hóa đơn được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hóa đơn' })
  async deleteInvoice(@Param('id') id: string): Promise<void> {
    return await this.invoiceService.deleteInvoice(id);
  }
}