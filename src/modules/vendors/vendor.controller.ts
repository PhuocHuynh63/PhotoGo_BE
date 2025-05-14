import {
  Controller, Post, Get, Put, Delete, Body, Param, Query,
  UseInterceptors, UploadedFiles, Logger
} from '@nestjs/common';
import { VendorService } from './vendor.service';
import { ReviewService } from '../reviews/reviews.service';
import {
  CreateVendorDto, CreateVendorManagerDto,
  CreateVendorLikeDto, CreateVendorAvailabilityDto
} from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorStatus } from 'src/constants/vendor.enum';
import { Vendor } from './entities/vendor.entity';
import { Public, ResponseMessage } from 'src/decorator/custom';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiConsumes, ApiBody, ApiQuery
} from '@nestjs/swagger';
import { FindVendorDto } from './dto/find-vendor.dto';
import { FilterVendorDto } from './dto/filter-vendor.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { VendorResponseDto } from './dto/response/vendor-response.dto';

@ApiTags('Vendors')
@Controller('vendors')
@ApiBearerAuth('access-token')
export class VendorController {
  private readonly logger = new Logger(VendorController.name);

  constructor(
    private readonly vendorService: VendorService,
    private readonly reviewService: ReviewService,
  ) {}

  //#region Create Vendor
  @Post()
  @ApiOperation({ summary: 'Create a new vendor (Protected)' })
  @ApiResponse({ status: 201, description: 'Vendor created successfully', type: Vendor })
  @ResponseMessage('Tạo nhà cung cấp thành công')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Vendor data and files',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Sunset Photography Studio' },
        category_id: { type: 'string', example: 'C003' },
        slug: { type: 'string', example: 'sunset-photography-studio' },
        description: { type: 'string', nullable: true },
        status: { type: 'string', enum: Object.values(VendorStatus), nullable: true },
        locations: {
          type: 'string',
          example: '[{"address":"321 Phạm Văn Đồng","district":"Thủ Đức","ward":"Linh Tây","city":"Hồ Chí Minh","province":"Hồ Chí Minh","latitude":18.8491,"longitude":106.7724}]',
        },
        logo: { type: 'string', format: 'binary' },
        banner: { type: 'string', format: 'binary' },
      },
      required: ['name', 'category_id', 'slug'],
    },
  })
  async create(
    @Body() createVendorDto: CreateVendorDto,
    @UploadedFiles() files: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] },
  ): Promise<Vendor> {
    this.logger.log(`Received create vendor request: ${JSON.stringify(createVendorDto)}`);
    const fileMap = {
      logo: files.logo?.[0],
      banner: files.banner?.[0],
    };
    return this.vendorService.create(createVendorDto, fileMap);
  }

  //#region Filter / Search
  @Public()
  @Get('filter')
  @ApiOperation({ summary: 'Filter vendors (Public)' })
  @ApiResponse({ status: 200, description: 'Filtered vendors list' })
  async filterVendors(@Query() filterDto: FilterVendorDto) {
    const result = await this.vendorService.filterVendors(filterDto);
    return {
      message: 'Vendors filtered successfully',
      ...result,
    };
  }

  @Public()
  @Get('search/locations')
  @ApiOperation({ summary: 'Search vendors by location with city (Public)' })
  @ApiQuery({ name: 'term', required: true, description: 'Location search term', example: 'Hồ Chí Minh' })
  @ApiResponse({ status: 200, description: 'Matching vendors' })
  async searchLocations(@Query('term') term: string) {
    const result = await this.vendorService.searchLocationsWithCity(term);
    return {
      message: 'Vendors found by location search',
      ...result,
    };
  }

  @Get('available')
  @ApiOperation({ summary: 'Find available vendors by date/time' })
  @ApiQuery({ name: 'date', required: true, example: '2025-05-10' })
  @ApiQuery({ name: 'startTime', required: true, example: '09:00' })
  @ApiQuery({ name: 'endTime', required: true, example: '11:00' })
  @ApiResponse({ status: 200, description: 'Available vendors' })
  async findAllWithAvailability(
    @Query('date') date: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    const vendors = await this.vendorService.findAllWithAvailability(date, startTime, endTime);
    return {
      message: 'Vendors fetched with availability filter',
      data: vendors,
    };
  }

  //#region Get by slug and all
  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a vendor by slug (Public)' })
  @ApiResponse({ status: 200, type: VendorResponseDto })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async findBySlug(@Param('slug') slug: string): Promise<VendorResponseDto> {
    return this.vendorService.findBySlug(slug);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all vendors (Public)' })
  @ApiResponse({ status: 200, type: [Vendor] })
  @ResponseMessage('Lấy danh sách nhà cung cấp thành công')
  async findAll(@Query() query: FindVendorDto) {
    return this.vendorService.findAll(query);
  }

  //#region Get by ID (last)
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a vendor by ID (Public)' })
  @ApiResponse({ status: 200, type: VendorResponseDto })
  async findOne(@Param('id') id: string): Promise<VendorResponseDto> {
    return this.vendorService.getVendorResponse(id, this.reviewService);
  }

  //#region Update / Delete
  @Put(':id')
  @ApiOperation({ summary: 'Update a vendor by ID (multipart/form-data)' })
  @ApiResponse({ status: 200, type: Vendor })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Update vendor data and files',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'New Vendor Name' },
        description: { type: 'string', nullable: true },
        status: { type: 'string', enum: Object.values(VendorStatus), nullable: true },
        logo: { type: 'string', format: 'binary' },
        banner: { type: 'string', format: 'binary' },
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() updateVendorDto: UpdateVendorDto,
    @UploadedFiles() files: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] },
  ): Promise<Vendor> {
    const fileMap = {
      logo: files.logo?.[0],
      banner: files.banner?.[0],
    };
    return this.vendorService.update(id, updateVendorDto, fileMap);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a vendor by ID' })
  @ApiResponse({ status: 200, description: 'Vendor deleted successfully' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.vendorService.remove(id);
  }

  //#region VendorManager
  @Post('managers')
  @ApiOperation({ summary: 'Add a manager to a vendor (Protected)' })
  @ApiResponse({ status: 201, description: 'Vendor manager added successfully' })
  async addManager(@Body() createVendorManagerDto: CreateVendorManagerDto): Promise<void> {
    return this.vendorService.addManager(createVendorManagerDto);
  }

  //#region VendorLike
  @Post('likes')
  @ApiOperation({ summary: 'Like a vendor (Protected)' })
  @ApiResponse({ status: 201, description: 'Vendor liked successfully' })
  async likeVendor(@Body() createVendorLikeDto: CreateVendorLikeDto): Promise<void> {
    return this.vendorService.likeVendor(createVendorLikeDto);
  }

  //#region VendorAvailability
  @Post('availabilities')
  @ApiOperation({ summary: 'Add availability for a vendor (Protected)' })
  @ApiResponse({ status: 201, description: 'Vendor availability added successfully' })
  async addAvailability(@Body() createVendorAvailabilityDto: CreateVendorAvailabilityDto): Promise<void> {
    return this.vendorService.addAvailability(createVendorAvailabilityDto);
  }
}
