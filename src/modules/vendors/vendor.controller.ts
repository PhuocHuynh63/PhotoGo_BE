import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { CreateVendorDto, CreateVendorManagerDto, CreateVendorLikeDto, CreateVendorAvailabilityDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorStatus } from './entities/vendor.entity';
import { Vendor } from './entities/vendor.entity';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FindVendorDto } from './dto/find-vendor.dto';
import { FilesInterceptor } from '@nestjs/platform-express';


@ApiTags('Vendors')
@Controller('vendors')
@ApiBearerAuth('access-token')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  //#region Vendor
  @Post()
  @ApiOperation({ summary: 'Create a new vendor (Protected)' })
  @ApiResponse({ status: 201, description: 'Vendor created successfully', type: Vendor })
  @ResponseMessage('Tạo nhà cung cấp thành công')
  @UseInterceptors(FilesInterceptor('files', 3))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Vendor data and files',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Vendor Name' },
        category_id: { type: 'string', example: 'uuid_of_category' },
        slug: { type: 'string', example: 'vendor-slug' },
        description: { type: 'string', example: 'Studio chụp ảnh chuyên nghiệp', nullable: true },
        status: { type: 'string', enum: Object.values(VendorStatus), example: VendorStatus.ACTIVE, nullable: true },
        locations: { type: 'array', items: { type: 'object' }, example: [{ address: '123 Street', city: 'Hanoi' }] },
        logo: { type: 'string', format: 'binary' },
        banner: { type: 'string', format: 'binary' },
        image_url: { type: 'string', format: 'binary' },
      },
      required: ['name', 'category_id', 'slug'],
    },
  })
  async create(
    @Body() createVendorDto: CreateVendorDto,
    @UploadedFiles() files: { logo?: Express.Multer.File; banner?: Express.Multer.File; image_url?: Express.Multer.File },
  ): Promise<Vendor> {
    return this.vendorService.create(createVendorDto, files);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all vendors (Public)' })
  @ApiResponse({
    status: 200,
    description: 'List of vendors with pagination',
    type: [Vendor],
  })
  @ResponseMessage('Lấy danh sách nhà cung cấp thành công')
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

  @Put(':id')
  @ApiOperation({ summary: 'Update a vendor by ID' })
  @ApiResponse({ status: 200, description: 'Vendor updated successfully', type: Vendor })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async update(@Param('id') id: string, @Body() updateVendorDto: UpdateVendorDto): Promise<Vendor> {
    return this.vendorService.update(id, updateVendorDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a vendor by ID' })
  @ApiResponse({ status: 200, description: 'Vendor deleted successfully' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.vendorService.remove(id);
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
