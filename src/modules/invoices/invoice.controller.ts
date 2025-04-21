import { Controller, Post, Get, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { FindAllInvoicesDto } from './dto/find-all.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ApiTags, ApiBearerAuth, ApiOperation , ApiResponse } from '@nestjs/swagger';

@Controller('invoices')
@ApiTags('Invoice')
@ApiBearerAuth('access-token')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return await this.invoiceService.create(createInvoiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all invoices' })
  @ApiResponse({ status: 200, description: 'List of all invoices', type: [CreateInvoiceDto] })
  @ApiResponse({ status: 404, description: 'No invoices found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findAll(@Query() query: FindAllInvoicesDto) {
    return await this.invoiceService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice found', type: CreateInvoiceDto })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findOne(@Param('id') id: string) {
    return await this.invoiceService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice updated successfully', type: UpdateInvoiceDto })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async updateInvoice(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto): Promise<Invoice> {
    return await this.invoiceService.updateInvoice(id, updateInvoiceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice deleted successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async deleteInvoice(@Param('id') id: string): Promise<void> {
    return await this.invoiceService.deleteInvoice(id);
  }
}