import { Controller, Post, Get, Param, Query, Body } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { FindAllInvoicesDto } from './dto/find-all.dto';
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
}