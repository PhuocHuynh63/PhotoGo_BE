import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { CreateVendorDto, CreateVendorManagerDto, CreateVendorLikeDto, CreateVendorAvailabilityDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorStatus } from 'src/constants/vendor.enum';
import { Vendor } from './entities/vendor.entity';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FindVendorDto } from './dto/find-vendor.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';


@ApiTags('Vendors')
@Controller('vendors')
@ApiBearerAuth('access-token')
export class VendorController {
  private readonly logger = new Logger(VendorController.name);
  constructor(private readonly vendorService: VendorService) {}

  //#region Vendor
  @Post()
  @ApiOperation({ summary: 'Create a new vendor (Protected)' })
  @ApiResponse({ status: 201, description: 'Vendor created successfully', type: Vendor })
  @ResponseMessage('Tạo nhà cung cấp thành công')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
    { name: 'image_url', maxCount: 1 },
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
        description: { type: 'string', example: 'A professional studio for capturing your best moments.', nullable: true },
        status: { type: 'string', enum: Object.values(VendorStatus), example: VendorStatus.ACTIVE, nullable: true },
        locations: {
          type: 'string',
          description: 'A JSON string representing an array of locations',
          example: '[{"address":"321 Phạm Văn Đồng","district":"Thủ Đức","ward":"Linh Tây","city":"Hồ Chí Minh","province":"Hồ Chí Minh","latitude":18.8491,"longitude":106.7724},{"address":"456 Lê Văn Việt","district":"Thủ Đức","ward":"Tăng Nhơn Phú A","city":"Hồ Chí Minh","province":"Hồ Chí Minh","latitude":18.8432,"longitude":106.7793}]',
        },
        logo: { type: 'string', format: 'binary' },
        banner: { type: 'string', format: 'binary' },
        image_url: { type: 'string', format: 'binary' },
      },
      required: ['name', 'category_id', 'slug'],
    },
  })
  async create(
    @Body() createVendorDto: CreateVendorDto,
    @UploadedFiles() files: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[]; image_url?: Express.Multer.File[] },
  ): Promise<Vendor> {
    this.logger.log(`Received create vendor request: ${JSON.stringify(createVendorDto)}`);

    const fileMap = {
      logo: files.logo && files.logo[0],
      banner: files.banner && files.banner[0],
      image_url: files.image_url && files.image_url[0],
    };

    return this.vendorService.create(createVendorDto, fileMap);
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
