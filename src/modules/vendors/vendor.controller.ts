import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { Vendor } from './entities/vendor.entity';
import { Public } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindVendorDto } from './dto/find-vendor.dto';
import { Param } from '@nestjs/common/decorators/http/route-params.decorator';


@ApiTags('Vendors')
@Controller('vendors')
@ApiBearerAuth('access-token')
export class VendorController {
  constructor(private readonly vendorService: VendorService) { }

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

  // Thêm phương thức findOne
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a vendor by ID (Protected)' })
  @ApiResponse({ status: 200, description: 'Vendor found', type: Vendor })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string): Promise<Vendor> {
    return this.vendorService.findOne(id);
  }
}
