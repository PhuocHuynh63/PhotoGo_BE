import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { CreateVendorDto } from './dto/vendor.dto';
import { Vendor } from './entities/vendor.entity';
import { Public } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindVendorDto } from './dto/find-vendor.dto';

@ApiTags('vendors')
@Controller('vendors')
@ApiBearerAuth('access-token')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new vendor (Protected)' })
  @ApiResponse({ status: 201, description: 'Vendor created successfully', type: Vendor })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createVendorDto: CreateVendorDto): Promise<Vendor> {
    return this.vendorService.create(createVendorDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all vendors (Public)' })
  @ApiResponse({
    status: 200,
    description: 'List of vendors with pagination',
    type: [Vendor],
  })
  async findAll(@Query() query: FindVendorDto): Promise<{
    data: Vendor[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.vendorService.findAll(query);
  }
}