import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { Voucher } from './entities/voucher.entity';
import { Public } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindVoucherDto } from './dto/find-voucher.dto';

@ApiTags('Vouchers')
@Controller('vouchers')
@ApiBearerAuth('access-token')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new voucher (Protected)' })
  @ApiResponse({ status: 201, description: 'Voucher created successfully', type: Voucher })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createVoucherDto: CreateVoucherDto): Promise<Voucher> {
    return this.voucherService.create(createVoucherDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all vouchers (Public)' })
  @ApiResponse({
    status: 200,
    description: 'List of vouchers with pagination',
    type: [Voucher],
  })
  async findAll(@Query() query: FindVoucherDto): Promise<{
    data: Voucher[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.voucherService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a voucher by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Voucher found', type: Voucher })
  @ApiResponse({ status: 404, description: 'Voucher not found' })
  async findOne(@Param('id') id: string): Promise<Voucher> {
    return this.voucherService.findOne(id);
  }
}