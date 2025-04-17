import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { CreateVendorDto, CreateVendorManagerDto, CreateVendorLikeDto, CreateVendorAvailabilityDto } from './dto/create-vendor.dto';
import { Vendor } from './entities/vendor.entity';
import { Public } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindVendorDto } from './dto/find-vendor.dto';

@ApiTags('Vendors')
@Controller('vendors')
@ApiBearerAuth('access-token')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  //#region Vendor
  @Post()
  @ApiOperation({ summary: 'Create a new vendor (Protected)' })
  @ApiResponse({ status: 201, description: 'Vendor created successfully', type: Vendor })
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

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a vendor by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Vendor found', type: Vendor })
  async findOne(@Param('id') id: string): Promise<Vendor> {
    return this.vendorService.findOne(id);
  }
  //#endregion Vendor

  //#region VendorManager
  @Post('managers')
  @ApiOperation({ summary: 'Add a manager to a vendor (Protected)' })
  @ApiResponse({ status: 201, description: 'Vendor manager added successfully' })
  async addManager(@Body() createVendorManagerDto: CreateVendorManagerDto): Promise<void> {
    return this.vendorService.addManager(createVendorManagerDto);
  }
  //#endregion VendorManager

  //#region VendorLike
  @Post('likes')
  @ApiOperation({ summary: 'Like a vendor (Protected)' })
  @ApiResponse({ status: 201, description: 'Vendor liked successfully' })
  async likeVendor(@Body() createVendorLikeDto: CreateVendorLikeDto): Promise<void> {
    return this.vendorService.likeVendor(createVendorLikeDto);
  }
  //#endregion VendorLike

  //#region VendorAvailability
  @Post('availabilities')
  @ApiOperation({ summary: 'Add availability for a vendor (Protected)' })
  @ApiResponse({ status: 201, description: 'Vendor availability added successfully' })
  async addAvailability(@Body() createVendorAvailabilityDto: CreateVendorAvailabilityDto): Promise<void> {
    return this.vendorService.addAvailability(createVendorAvailabilityDto);
  }
  //#endregion VendorAvailability
}
