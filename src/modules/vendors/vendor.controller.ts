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
import { VendorStatus, VendorSortField } from 'src/constants/vendor.enum';
import { Vendor } from './entities/vendor.entity';
import { Public, ResponseMessage } from 'src/decorator/custom';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiConsumes, ApiBody, ApiQuery
} from '@nestjs/swagger';
import { FindVendorDto } from './dto/find-vendor.dto';
import { FilterVendorDto, RemarkableVendorDto } from './dto/filter-vendor.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { VendorResponseDto } from './dto/response/vendor-response.dto';
import { Location } from '../locations/entities/location.entity';

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
  @ApiOperation({ summary: 'Tạo mới một nhà cung cấp (Protected)' })
  @ApiResponse({ status: 201, description: 'Nhà cung cấp đã được tạo thành công', type: Vendor })
  @ResponseMessage('Tạo nhà cung cấp thành công')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Dữ liệu và tệp của nhà cung cấp',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Sunset Photography Studio' },
        category_id: { type: 'string', example: 'C003' },
        // slug: { type: 'string', example: 'sunset-photography-studio' },
        user_id: { type: 'uuid', example: 'uuid_of_user' },
        description: { type: 'string', nullable: true },
        status: { type: 'string', enum: Object.values(VendorStatus), nullable: true },
        locations: {
          type: 'string',
          example: '[{"address":"321 Phạm Văn Đồng","district":"Thủ Đức","ward":"Linh Tây","city":"Hồ Chí Minh","province":"Hồ Chí Minh","latitude":18.8491,"longitude":106.7724}]',
        },
        logo: { type: 'string', format: 'binary' },
        banner: { type: 'string', format: 'binary' },
      },
      required: ['name', 'category_id', 'user_id'],
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
  @ApiOperation({ summary: 'Lọc nhà cung cấp (Public)' })
  @ApiResponse({ status: 200, description: 'Danh sách nhà cung cấp đã được lọc' })
  async filterVendors(@Query() filterDto: FilterVendorDto) {
    const result = await this.vendorService.filterVendors(filterDto);
    return {
      message: 'Nhà cung cấp đã được lọc thành công',
      ...result,
    };
  }

  @Public()
  @Get('remarkable')
  @ApiOperation({ summary: 'Lấy danh sách nhà cung cấp nổi bật (Public)' })
  @ApiResponse({ status: 200, description: 'Danh sách nhà cung cấp nổi bật' })
  async getRemarkableVendors(@Query() remarkableDto: RemarkableVendorDto) {
    const result = await this.vendorService.filterVendors({
      ...remarkableDto,
      sortBy: remarkableDto.sortBy || VendorSortField.SUBSCRIPTION_COUNT,
      sortDirection: remarkableDto.sortDirection || 'desc',
      pageSize: remarkableDto.pageSize || '10',
    });
    return {
      message: 'Danh sách nhà cung cấp nổi bật đã được lấy thành công',
      ...result,
    };
  }

  @Public()
  @Get('search/locations')
  @ApiOperation({ summary: 'Tìm kiếm nhà cung cấp theo vị trí với thành phố (Public)' })
  @ApiQuery({ name: 'term', required: true, description: 'Từ tìm kiếm vị trí', example: 'Hồ Chí Minh' })
  @ApiResponse({ status: 200, description: 'Nhà cung cấp khớp' })
  async searchLocations(@Query('term') term: string) {
    const result = await this.vendorService.searchLocationsWithCity(term);
    return {
      message: 'Nhà cung cấp đã được tìm kiếm thành công',
      ...result,
    };
  }

  @Get('available')
  @ApiOperation({ summary: 'Tìm kiếm nhà cung cấp có sẵn theo ngày/thời gian' })
  @ApiQuery({ name: 'date', required: true, example: '2025-05-10' })
  @ApiQuery({ name: 'startTime', required: true, example: '09:00' })
  @ApiQuery({ name: 'endTime', required: true, example: '11:00' })
  @ApiResponse({ status: 200, description: 'Nhà cung cấp có sẵn' })
  async findAllWithAvailability(
    @Query('date') date: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    const vendors = await this.vendorService.findAllWithAvailability(date, startTime, endTime);
    return {
      message: 'Nhà cung cấp đã được tìm kiếm thành công',
      data: vendors,
    };
  }

  //#region Get by slug and all
  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Lấy một nhà cung cấp theo slug (Public)' })
  @ApiResponse({ status: 200, type: VendorResponseDto })
  @ApiResponse({ status: 404, description: 'Nhà cung cấp không tồn tại' })
  async findBySlug(@Param('slug') slug: string): Promise<VendorResponseDto> {
    const vendor = await this.vendorService.findBySlug(slug);
    return this.vendorService.getVendorResponse(vendor.id, this.reviewService);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy tất cả nhà cung cấp (Public)' })
  @ApiResponse({ status: 200, type: [Vendor] })
  @ResponseMessage('Lấy danh sách nhà cung cấp thành công')
  async findAll(@Query() query: FindVendorDto) {
    return this.vendorService.findAll(query);
  }

  @Get('user/:userID')
  @Public()
  @ApiOperation({ summary: 'Lấy một nhà cung cấp theo userID (Public)' })
  @ApiResponse({ status: 200, type: VendorResponseDto })
  async getVendorByUserID(@Param('userID') userID: string): Promise<VendorResponseDto> {
    const vendor = await this.vendorService.getVendorByUserID(userID);
    return this.vendorService.getVendorResponse(vendor.id, this.reviewService);
  }
  
  //#region Get by ID (last)
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Lấy một nhà cung cấp theo ID (Public)' })
  @ApiResponse({ status: 200, type: VendorResponseDto })
  async findOne(@Param('id') id: string): Promise<VendorResponseDto> {
    return this.vendorService.getVendorResponse(id, this.reviewService);
  }

  //#region Update / Delete
  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật một nhà cung cấp theo ID (multipart/form-data)' })
  @ApiResponse({ status: 200, type: Vendor })
  @ApiResponse({ status: 404, description: 'Nhà cung cấp không tồn tại' })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Cập nhật dữ liệu và tệp của nhà cung cấp',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'New Vendor Name' },
        description: { type: 'string', nullable: true },
        user_id: { type: 'uuid', example: 'uuid_of_user', nullable: true },
        status: { type: 'string', enum: Object.values(VendorStatus), nullable: true },
        locations: {
          type: 'string',
          example: '[{"address":"321 Phạm Văn Đồng","district":"Thủ Đức","ward":"Linh Tây","city":"Hồ Chí Minh","province":"Hồ Chí Minh","latitude":18.8491,"longitude":106.7724}]',
        },
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
  @ApiOperation({ summary: 'Xóa một nhà cung cấp theo ID' })
  @ApiResponse({ status: 200, description: 'Nhà cung cấp đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Nhà cung cấp không tồn tại' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.vendorService.remove(id);
  }

  //#region VendorManager
  @Post('managers')
  @ApiOperation({ summary: 'Thêm một quản lý cho một nhà cung cấp (Protected)' })
  @ApiResponse({ status: 201, description: 'Quản lý nhà cung cấp đã được thêm thành công' })
  async addManager(@Body() createVendorManagerDto: CreateVendorManagerDto): Promise<void> {
    return this.vendorService.addManager(createVendorManagerDto);
  }

  //#region VendorLike
  @Post('likes')
  @ApiOperation({ summary: 'Thích một nhà cung cấp (Protected)' })
  @ApiResponse({ status: 201, description: 'Nhà cung cấp đã được thích thành công' })
  async likeVendor(@Body() createVendorLikeDto: CreateVendorLikeDto): Promise<void> {
    return this.vendorService.likeVendor(createVendorLikeDto);
  }

  //#region VendorAvailability
  @Post('availabilities')
  @ApiOperation({ summary: 'Thêm khả năng có sẵn cho một nhà cung cấp (Protected)' })
  @ApiResponse({ status: 201, description: 'Khả năng có sẵn của nhà cung cấp đã được thêm thành công' })
  async addAvailability(@Body() createVendorAvailabilityDto: CreateVendorAvailabilityDto): Promise<void> {
    return this.vendorService.addAvailability(createVendorAvailabilityDto);
  }
}
