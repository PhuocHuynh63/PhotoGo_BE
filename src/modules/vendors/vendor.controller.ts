import {
  Controller, Post, Get, Put, Delete, Body, Param, Query,
  UseInterceptors, UploadedFiles, Logger, HttpException, HttpStatus
} from '@nestjs/common';
import { VendorService } from './vendor.service';
import { ReviewService } from '../reviews/reviews.service';
import {
  CreateVendorDto, CreateVendorManagerDto,
  CreateVendorLikeDto
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
import { FilterVendorAdminDto } from './dto/admin/filter-vendor-admin.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { VendorResponseDto } from './dto/response/vendor-response.dto';
import { Location } from '../locations/entities/location.entity';
import { isUUID } from 'class-validator';
import { CreateLocationDto } from '../locations/dto/create-location.dto';

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
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user hoặc danh mục' })
  @ApiResponse({ status: 409, description: 'User đã có nhà cung cấp' })
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
        user_id: { type: 'uuid', example: 'uuid_of_user' },
        description: { type: 'string', nullable: true },
        status: { type: 'string', enum: Object.values(VendorStatus), nullable: true },
        location: {
          type: 'string',
          example: '{"address":"321 Phạm Văn Đồng","district":"Thủ Đức","ward":"Linh Tây","city":"Hồ Chí Minh","province":"Hồ Chí Minh","latitude":10.762622,"longitude":106.660172}',
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
    try {
      this.logger.log(`Received create vendor request: ${JSON.stringify(createVendorDto)}`);

      // Validate required fields
      if (!createVendorDto.name?.trim()) {
        throw new HttpException('Tên nhà cung cấp không được để trống', HttpStatus.BAD_REQUEST);
      }

      if (!createVendorDto.category_id?.trim()) {
        throw new HttpException('Danh mục không được để trống', HttpStatus.BAD_REQUEST);
      }

      if (!createVendorDto.user_id?.trim() || !isUUID(createVendorDto.user_id)) {
        throw new HttpException('ID người dùng không hợp lệ', HttpStatus.BAD_REQUEST);
      }

      // Validate location if provided (location is already transformed by DTO)
      if (createVendorDto.location) {
        if (!createVendorDto.location.address?.trim()) {
          throw new HttpException('Địa chỉ không được để trống', HttpStatus.BAD_REQUEST);
        }
        // Validate coordinates if provided manually
        if (createVendorDto.location.latitude !== undefined && createVendorDto.location.longitude !== undefined) {
          if (typeof createVendorDto.location.latitude !== 'number' || typeof createVendorDto.location.longitude !== 'number') {
            throw new HttpException('Tọa độ không hợp lệ', HttpStatus.BAD_REQUEST);
          }
          if (createVendorDto.location.latitude < -90 || createVendorDto.location.latitude > 90) {
            throw new HttpException('Vĩ độ phải từ -90 đến 90', HttpStatus.BAD_REQUEST);
          }
          if (createVendorDto.location.longitude < -180 || createVendorDto.location.longitude > 180) {
            throw new HttpException('Kinh độ phải từ -180 đến 180', HttpStatus.BAD_REQUEST);
          }
        }
      }

      const fileMap = {
        logo: files.logo?.[0],
        banner: files.banner?.[0],
      };
      return await this.vendorService.create(createVendorDto, fileMap);
    } catch (error) {
      this.logger.error(`Error creating vendor: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi tạo nhà cung cấp', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  //#region Filter / Search
  @Public()
  @Get('filter')
  @ApiOperation({ summary: 'Lọc nhà cung cấp (Public)' })
  @ApiResponse({ status: 200, description: 'Danh sách nhà cung cấp đã được lọc' })
  @ApiResponse({ status: 400, description: 'Tham số lọc không hợp lệ' })
  async filterVendors(@Query() filterDto: FilterVendorDto) {
    try {
      // Validate filter parameters
      if (filterDto.minPrice && filterDto.maxPrice && filterDto.minPrice > filterDto.maxPrice) {
        throw new HttpException('Giá tối thiểu không được lớn hơn giá tối đa', HttpStatus.BAD_REQUEST);
      }

      if (filterDto.minRating && filterDto.maxRating && filterDto.minRating > filterDto.maxRating) {
        throw new HttpException('Đánh giá tối thiểu không được lớn hơn đánh giá tối đa', HttpStatus.BAD_REQUEST);
      }

      const result = await this.vendorService.filterVendors(filterDto);
      return {
        message: 'Nhà cung cấp đã được lọc thành công',
        ...result,
      };
    } catch (error) {
      this.logger.error(`Error filtering vendors: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi lọc nhà cung cấp', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  //region get filter for admin page
  @Public()
  @Get('admin/filter')
  @ApiOperation({ summary: 'Lấy danh sách nhà cung cấp (Admin)' })
  @ApiResponse({ status: 200, description: 'Danh sách nhà cung cấp đã được lọc' })
  @ApiResponse({ status: 400, description: 'Tham số lọc không hợp lệ' })
  async getAdminFilterVendors(@Query() filterDto: FilterVendorAdminDto) {
    try {
      // Validate filter parameters
      if (filterDto.minBranches && filterDto.maxBranches && filterDto.minBranches > filterDto.maxBranches) {
        throw new HttpException('Số chi nhánh tối thiểu không được lớn hơn số chi nhánh tối đa', HttpStatus.BAD_REQUEST);
      }

      if (filterDto.minPackages && filterDto.maxPackages && filterDto.minPackages > filterDto.maxPackages) {
        throw new HttpException('Số package tối thiểu không được lớn hơn số package tối đa', HttpStatus.BAD_REQUEST);
      }

      if (filterDto.minOrders && filterDto.maxOrders && filterDto.minOrders > filterDto.maxOrders) {
        throw new HttpException('Số order tối thiểu không được lớn hơn số order tối đa', HttpStatus.BAD_REQUEST);
      }

      if (filterDto.minRating && filterDto.maxRating && filterDto.minRating > filterDto.maxRating) {
        throw new HttpException('Đánh giá tối thiểu không được lớn hơn đánh giá tối đa', HttpStatus.BAD_REQUEST);
      }

      if (filterDto.minPriority && filterDto.maxPriority && filterDto.minPriority > filterDto.maxPriority) {
        throw new HttpException('Độ ưu tiên tối thiểu không được lớn hơn độ ưu tiên tối đa', HttpStatus.BAD_REQUEST);
      }

      if (filterDto.joinDateFrom && filterDto.joinDateTo && filterDto.joinDateFrom > filterDto.joinDateTo) {
        throw new HttpException('Ngày tham gia từ không được lớn hơn ngày tham gia đến', HttpStatus.BAD_REQUEST);
      }

      const result = await this.vendorService.filterVendorsAdmin(filterDto);
      return {
        message: 'Danh sách nhà cung cấp đã được lọc thành công',
        ...result,
      };
    } catch (error) {
      this.logger.error(`Error filtering vendors for admin: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi lọc nhà cung cấp', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Public()
  @Get('remarkable')
  @ApiOperation({ summary: 'Lấy danh sách nhà cung cấp nổi bật (Public)' })
  @ApiResponse({ status: 200, description: 'Danh sách nhà cung cấp nổi bật' })
  @ApiResponse({ status: 400, description: 'Tham số không hợp lệ' })
  async getRemarkableVendors(@Query() remarkableDto: RemarkableVendorDto) {
    try {
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
    } catch (error) {
      this.logger.error(`Error getting remarkable vendors: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi lấy danh sách nhà cung cấp nổi bật', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Public()
  @Get('concept_image')
  @ApiOperation({ summary: 'Lấy danh sách hình ảnh concept dựa trên vendor id (Public)' })
  @ApiQuery({ name: 'vendor_id', required: true, description: 'ID của nhà cung cấp', example: 'uuid_of_vendor' })
  @ApiQuery({ name: 'current', required: false, description: 'Trang hiện tại', example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Số lượng item trên mỗi trang', example: 10 })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách hình ảnh concept',
    schema: {
      properties: {
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object' } },
        pagination: {
          type: 'object',
          properties: {
            current: { type: 'number' },
            pageSize: { type: 'number' },
            totalPage: { type: 'number' },
            totalItem: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'ID nhà cung cấp không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhà cung cấp' })
  async getConceptImage(
    @Query('vendor_id') vendorId: string,
    @Query('current') current?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    try {
      if (!vendorId?.trim() || !isUUID(vendorId)) {
        throw new HttpException('ID nhà cung cấp không hợp lệ', HttpStatus.BAD_REQUEST);
      }

      const result = await this.vendorService.getConceptImage(
        vendorId,
        current ? parseInt(current) : undefined,
        pageSize ? parseInt(pageSize) : undefined
      );
      return {
        message: 'Danh sách hình ảnh concept đã được lấy thành công',
        ...result,
      };
    } catch (error) {
      this.logger.error(`Error getting concept images: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi lấy danh sách hình ảnh concept', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Public()
  @Get('search/locations')
  @ApiOperation({ summary: 'Tìm kiếm nhà cung cấp theo vị trí với thành phố (Public)' })
  @ApiQuery({ name: 'term', required: true, description: 'Từ tìm kiếm vị trí', example: 'Hồ Chí Minh' })
  @ApiResponse({ status: 200, description: 'Nhà cung cấp khớp' })
  @ApiResponse({ status: 400, description: 'Từ khóa tìm kiếm không hợp lệ' })
  async searchLocations(@Query('term') term: string) {
    try {
      if (!term?.trim()) {
        throw new HttpException('Từ khóa tìm kiếm không được để trống', HttpStatus.BAD_REQUEST);
      }

      const result = await this.vendorService.searchLocation(term);
      return {
        message: 'Nhà cung cấp đã được tìm kiếm thành công',
        ...result,
      };
    } catch (error) {
      this.logger.error(`Error searching locations: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi tìm kiếm vị trí', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  //#region Get by slug and all
  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Lấy một nhà cung cấp theo slug (Public)' })
  @ApiResponse({ status: 200, type: VendorResponseDto })
  @ApiResponse({ status: 404, description: 'Nhà cung cấp không tồn tại' })
  async findBySlug(@Param('slug') slug: string): Promise<VendorResponseDto> {
    try {
      if (!slug?.trim()) {
        throw new HttpException('Slug không được để trống', HttpStatus.BAD_REQUEST);
      }

      const vendor = await this.vendorService.findBySlug(slug);
      return this.vendorService.getVendorResponse(vendor.id, this.reviewService);
    } catch (error) {
      this.logger.error(`Error finding vendor by slug: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi tìm kiếm nhà cung cấp', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy tất cả nhà cung cấp (Public)' })
  @ApiResponse({ status: 200, type: [Vendor] })
  @ResponseMessage('Lấy danh sách nhà cung cấp thành công')
  async findAll(@Query() query: FindVendorDto) {
    try {
      return await this.vendorService.findAll(query);
    } catch (error) {
      this.logger.error(`Error finding all vendors: ${error.message}`);
      throw new HttpException('Lỗi khi lấy danh sách nhà cung cấp', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('user/:userID')
  @ApiOperation({ summary: 'Lấy nhà cung cấp theo ID người dùng' })
  @ApiResponse({ status: 200, type: VendorResponseDto })
  @ApiResponse({ status: 400, description: 'ID người dùng không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhà cung cấp' })
  async getVendorByUserID(@Param('userID') userID: string): Promise<VendorResponseDto> {
    try {
      if (!userID?.trim() || !isUUID(userID)) {
        throw new HttpException('ID người dùng không hợp lệ', HttpStatus.BAD_REQUEST);
      }

      const vendor = await this.vendorService.getVendorByUserID(userID);
      return this.vendorService.getVendorResponse(vendor.id, this.reviewService);
    } catch (error) {
      this.logger.error(`Error finding vendor by user ID: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi tìm kiếm nhà cung cấp', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy một nhà cung cấp theo ID' })
  @ApiResponse({ status: 200, type: VendorResponseDto })
  @ApiResponse({ status: 400, description: 'ID không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhà cung cấp' })
  async findOne(@Param('id') id: string): Promise<VendorResponseDto> {
    try {
      if (!id?.trim() || !isUUID(id)) {
        throw new HttpException('ID không hợp lệ', HttpStatus.BAD_REQUEST);
      }

      const vendor = await this.vendorService.findOne(id);
      return this.vendorService.getVendorResponse(vendor.id, this.reviewService);
    } catch (error) {
      this.logger.error(`Error finding vendor by ID: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi tìm kiếm nhà cung cấp', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật nhà cung cấp theo ID' })
  @ApiResponse({ status: 200, description: 'Nhà cung cấp đã được cập nhật thành công', type: Vendor })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhà cung cấp' })
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
        description: { type: 'string', nullable: true },
        status: { type: 'string', enum: Object.values(VendorStatus), nullable: true },
        location: {
          type: 'string',
          example: '{"address":"321 Phạm Văn Đồng","district":"Thủ Đức","ward":"Linh Tây","city":"Hồ Chí Minh","province":"Hồ Chí Minh","latitude":18.8491,"longitude":106.7724}',
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
    try {
      if (!id?.trim() || !isUUID(id)) {
        throw new HttpException('ID không hợp lệ', HttpStatus.BAD_REQUEST);
      }

      // Validate location if provided (location is already transformed by DTO)
      if (updateVendorDto.location) {
        if (!updateVendorDto.location.address?.trim()) {
          throw new HttpException('Địa chỉ không được để trống', HttpStatus.BAD_REQUEST);
        }
        // Validate coordinates if provided manually
        if (updateVendorDto.location.latitude !== undefined && updateVendorDto.location.longitude !== undefined) {
          if (typeof updateVendorDto.location.latitude !== 'number' || typeof updateVendorDto.location.longitude !== 'number') {
            throw new HttpException('Tọa độ không hợp lệ', HttpStatus.BAD_REQUEST);
          }
          if (updateVendorDto.location.latitude < -90 || updateVendorDto.location.latitude > 90) {
            throw new HttpException('Vĩ độ phải từ -90 đến 90', HttpStatus.BAD_REQUEST);
          }
          if (updateVendorDto.location.longitude < -180 || updateVendorDto.location.longitude > 180) {
            throw new HttpException('Kinh độ phải từ -180 đến 180', HttpStatus.BAD_REQUEST);
          }
        }
      }

      const fileMap = {
        logo: files.logo?.[0],
        banner: files.banner?.[0],
      };
      return await this.vendorService.update(id, updateVendorDto, fileMap);
    } catch (error) {
      this.logger.error(`Error updating vendor: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi cập nhật nhà cung cấp', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa nhà cung cấp theo ID' })
  @ApiResponse({ status: 200, description: 'Nhà cung cấp đã được xóa thành công' })
  @ApiResponse({ status: 400, description: 'ID không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhà cung cấp' })
  async remove(@Param('id') id: string): Promise<void> {
    try {
      if (!id?.trim() || !isUUID(id)) {
        throw new HttpException('ID không hợp lệ', HttpStatus.BAD_REQUEST);
      }

      await this.vendorService.remove(id);
    } catch (error) {
      this.logger.error(`Error removing vendor: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi xóa nhà cung cấp', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('manager')
  @ApiOperation({ summary: 'Thêm quản lý cho nhà cung cấp' })
  @ApiResponse({ status: 201, description: 'Quản lý đã được thêm thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhà cung cấp hoặc người dùng' })
  async addManager(@Body() createVendorManagerDto: CreateVendorManagerDto): Promise<void> {
    try {
      if (!createVendorManagerDto.vendorId?.trim() || !isUUID(createVendorManagerDto.vendorId)) {
        throw new HttpException('ID nhà cung cấp không hợp lệ', HttpStatus.BAD_REQUEST);
      }

      if (!createVendorManagerDto.userId?.trim() || !isUUID(createVendorManagerDto.userId)) {
        throw new HttpException('ID người dùng không hợp lệ', HttpStatus.BAD_REQUEST);
      }

      await this.vendorService.addManager(createVendorManagerDto.vendorId, createVendorManagerDto);
    } catch (error) {
      this.logger.error(`Error adding manager: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi thêm quản lý', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('like')
  @ApiOperation({ summary: 'Thích nhà cung cấp' })
  @ApiResponse({ status: 201, description: 'Đã thích nhà cung cấp thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhà cung cấp hoặc người dùng' })
  async likeVendor(@Body() createVendorLikeDto: CreateVendorLikeDto): Promise<void> {
    try {
      if (!createVendorLikeDto.vendorId?.trim() || !isUUID(createVendorLikeDto.vendorId)) {
        throw new HttpException('ID nhà cung cấp không hợp lệ', HttpStatus.BAD_REQUEST);
      }

      if (!createVendorLikeDto.userId?.trim() || !isUUID(createVendorLikeDto.userId)) {
        throw new HttpException('ID người dùng không hợp lệ', HttpStatus.BAD_REQUEST);
      }

      await this.vendorService.likeVendor(createVendorLikeDto.vendorId, createVendorLikeDto);
    } catch (error) {
      this.logger.error(`Error liking vendor: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi thích nhà cung cấp', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
