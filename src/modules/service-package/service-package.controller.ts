import { Controller, Get, Post, Patch, Param, Delete, Body, UseInterceptors, UploadedFiles, UseGuards, Query, BadRequestException, Logger } from '@nestjs/common';
import { ServicePackageService } from './service-package.service';
import {
  CreateServicePackageDto,
  CreateServicePackageMetadataDto,
  CreateServiceConceptServiceTypeDto,
  CreateServiceTypeDto,
  CreateServiceConceptDto,
} from './dto/create-service-package.dto';
import {
  UpdateServicePackageDto,
  UpdateServicePackageMetadataDto,
  UpdateServiceConceptServiceTypeDto,
  UpdateServiceTypeDto,
  UpdateServiceConceptDto,
} from './dto/update-service-package.dto';
import { ServicePackage } from './entities/service-package.entity';
import { ServicePackageMetadata } from './entities/service-package-metadata.entity';
import { ServiceConceptServiceType } from './entities/service-concept-service-type.entity';
import { ServiceType } from './entities/service-type.entity';
import { ServiceConcept } from './entities/service-concept.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ServicePackageStatus } from 'src/constants/servicePackage.enum';
import { ServiceConceptStatus } from 'src/constants/serviceConcept.enum';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';
import { RolesGuard } from '../auth/passport/roles.guard';
import { Public } from 'src/decorator/custom';
import { FilterServicePackageDto } from './dto/filter-service-package.dto';
import { PaginatedFilteredServicePackageResponseDto } from './dto/response/filtered-service-package-response.dto';
import { Roles } from 'src/decorator/role.decorator';
import { Role } from 'src/modules/roles/entities/role.entity';
import { PaginationDto } from './dto/pagination.dto';
import { FilterServiceTypeDto } from './dto/filter-service-type.dto';
import { PaginatedServiceTypeResponseDto } from './dto/response/service-type-response.dto';

@ApiTags('Service Packages')
@Controller('service-packages')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServicePackageController {
  private readonly logger = new Logger(ServicePackageController.name);

  constructor(private readonly servicePackageService: ServicePackageService) {}

  //#region ServicePackage - Static Routes
  @Post()
  @Roles({ id: 'R008' } as Role)
  @ApiOperation({ summary: 'Tạo gói dịch vụ mới' })
  @ApiResponse({ status: 201, description: 'Gói dịch vụ đã được tạo thành công', type: ServicePackage })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Dữ liệu và tệp của gói dịch vụ',
    schema: {
      type: 'object',
      properties: {
        name: { 
          type: 'string', 
          example: 'Gói chụp ảnh cưới cao cấp',
          description: 'Tên của gói dịch vụ'
        },
        description: { 
          type: 'string', 
          example: 'Gói chụp ảnh cưới cao cấp bao gồm: 200 ảnh, 2 album, 1 video highlight',
          nullable: true,
          description: 'Mô tả chi tiết về gói dịch vụ'
        },
        vendorId: { 
          type: 'string', 
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'ID của nhà cung cấp dịch vụ'
        },
        status: { 
          type: 'string', 
          enum: Object.values(ServicePackageStatus), 
          example: ServicePackageStatus.ACTIVE,
          nullable: true,
          description: 'Trạng thái của gói dịch vụ'
        },
        image: { 
          type: 'string', 
          format: 'binary',
          description: 'Ảnh đại diện của gói dịch vụ'
        },
      },
      required: ['name', 'vendorId'],
    },
  })
  async create(
    @Body() createServicePackageDto: CreateServicePackageDto,
    @UploadedFiles() files: { image?: Express.Multer.File[] },
  ): Promise<ServicePackage> {
    const fileMap = {
      image: files.image?.[0],
    };
    return this.servicePackageService.create(createServicePackageDto, fileMap);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách tất cả gói dịch vụ' })
  @ApiResponse({ status: 200, description: 'Danh sách gói dịch vụ đã được lấy thành công', type: [ServicePackage] })
  async findAll(@Query() query: PaginationDto, @Query('showAll') showAll?: string): Promise<{ data: ServicePackage[]; pagination: { current: number; pageSize: number; totalPage: number; totalItem: number } }> {
    return this.servicePackageService.findAll(query, showAll === 'true');
  }

  @Get('filter')
  @Public()
  @ApiOperation({ summary: 'Lọc gói dịch vụ' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách gói dịch vụ đã được lọc',
    type: PaginatedFilteredServicePackageResponseDto,
  })
  async filterServicePackages(
    @Query() filterDto: FilterServicePackageDto,
  ): Promise<PaginatedFilteredServicePackageResponseDto> {
    return this.servicePackageService.filterServicePackages(filterDto);
  }

  //#region ServicePackageMetadata
  @Post('metadata')
  @Roles({ id: 'R008' } as Role)
  @ApiOperation({ summary: 'Tạo metadata cho gói dịch vụ' })
  @ApiResponse({ status: 201, description: 'Metadata đã được tạo thành công', type: ServicePackageMetadata })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async createMetadata(@Body() dto: CreateServicePackageMetadataDto): Promise<ServicePackageMetadata> {
    return this.servicePackageService.createMetadata(dto);
  }

  @Get('metadata')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách tất cả metadata' })
  @ApiResponse({ status: 200, description: 'Danh sách metadata đã được lấy thành công', type: [ServicePackageMetadata] })
  async findAllMetadata(@Query() query: PaginationDto, @Query('showAll') showAll?: string): Promise<{ data: ServicePackageMetadata[]; pagination: { current: number; pageSize: number; totalPage: number; totalItem: number } }> {
    return this.servicePackageService.findAllMetadata(query, showAll === 'true');
  }

  @Get('metadata/:id')
  @Public()
  @ApiOperation({ summary: 'Lấy metadata theo ID' })
  @ApiResponse({ status: 200, description: 'Metadata đã được tìm thấy', type: ServicePackageMetadata })
  @ApiResponse({ status: 404, description: 'Không tìm thấy metadata' })
  async findMetadata(@Param('id') id: string, @Query('showAll') showAll?: string): Promise<ServicePackageMetadata> {
    return this.servicePackageService.findMetadata(id, showAll === 'true');
  }

  @Patch('metadata/:id')
  @Roles({ id: 'R008' } as Role)
  @ApiOperation({ summary: 'Cập nhật metadata theo ID' })
  @ApiResponse({ status: 200, description: 'Metadata đã được cập nhật thành công', type: ServicePackageMetadata })
  @ApiResponse({ status: 404, description: 'Không tìm thấy metadata' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async updateMetadata(@Param('id') id: string, @Body() dto: UpdateServicePackageMetadataDto): Promise<ServicePackageMetadata> {
    return this.servicePackageService.updateMetadata(id, dto);
  }

  @Delete('metadata/:id')
  @Roles({ id: 'R008' } as Role)
  @ApiOperation({ summary: 'Xóa metadata theo ID' })
  @ApiResponse({ status: 200, description: 'Metadata đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy metadata' })
  async removeMetadata(@Param('id') id: string): Promise<void> {
    return this.servicePackageService.removeMetadata(id);
  }
  //#endregion ServicePackageMetadata

  //#region ServiceType
  @Post('service-type')
  @Roles({ id: 'R008' } as Role)
  @ApiOperation({ summary: 'Tạo loại dịch vụ mới' })
  @ApiResponse({ status: 201, description: 'Loại dịch vụ đã được tạo thành công', type: ServiceType })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async createServiceType(@Body() dto: CreateServiceTypeDto): Promise<ServiceType> {
    return this.servicePackageService.createServiceType(dto);
  }

  @Get('service-type')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách tất cả loại dịch vụ' })
  @ApiResponse({ status: 200, description: 'Danh sách loại dịch vụ đã được lấy thành công', type: [ServiceType] })
  async findAllServiceType(@Query() query: PaginationDto, @Query('showAll') showAll?: string): Promise<{ data: ServiceType[]; pagination: { current: number; pageSize: number; totalPage: number; totalItem: number } }> {
    return this.servicePackageService.findAllServiceTypes(query, showAll === 'true');
  }

  @Get('service-type/filter')
  @Public()
  @ApiOperation({ summary: 'Lọc loại dịch vụ' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách loại dịch vụ đã được lọc',
    type: PaginatedServiceTypeResponseDto,
  })
  async filterServiceTypes(
    @Query() filterDto: FilterServiceTypeDto,
  ): Promise<PaginatedServiceTypeResponseDto> {
    return this.servicePackageService.findAllServiceTypes(filterDto);
  }

  @Get('service-type/:id')
  @Public()
  @ApiOperation({ summary: 'Lấy loại dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Loại dịch vụ đã được tìm thấy', type: ServiceType })
  @ApiResponse({ status: 404, description: 'Không tìm thấy loại dịch vụ' })
  async findServiceType(@Param('id') id: string, @Query('showAll') showAll?: string): Promise<ServiceType & { conceptCount: number; packageCount: number }> {
    return this.servicePackageService.findServiceType(id, showAll === 'true');
  }

  @Patch('service-type/:id')
  @Roles({ id: 'R008' } as Role)
  @ApiOperation({ summary: 'Cập nhật loại dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Loại dịch vụ đã được cập nhật thành công', type: ServiceType })
  @ApiResponse({ status: 404, description: 'Không tìm thấy loại dịch vụ' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async updateServiceType(@Param('id') id: string, @Body() dto: UpdateServiceTypeDto): Promise<ServiceType & { conceptCount: number; packageCount: number }> {
    return this.servicePackageService.updateServiceType(id, dto);
  }

  @Patch('service-type/:id/toggle-status')
  @Roles({ id: 'R008' } as Role)
  @ApiOperation({ summary: 'Chuyển đổi trạng thái ẩn/hiện của loại dịch vụ' })
  @ApiResponse({ 
    status: 200, 
    description: 'Trạng thái loại dịch vụ đã được chuyển đổi thành công',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        status: { 
          type: 'string', 
          enum: ['hoạt động', 'không hoạt động'],
          example: 'hoạt động'
        },
        conceptCount: { type: 'number', example: 5 },
        packageCount: { type: 'number', example: 3 },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy loại dịch vụ' })
  async toggleServiceTypeStatus(@Param('id') id: string): Promise<ServiceType & { conceptCount: number; packageCount: number }> {
    return this.servicePackageService.toggleServiceTypeStatus(id);
  }

  @Delete('service-type/:id')
  @Roles({ id: 'R008' } as Role)
  @ApiOperation({ summary: 'Xóa loại dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Loại dịch vụ đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy loại dịch vụ' })
  async removeServiceType(@Param('id') id: string): Promise<void> {
    return this.servicePackageService.removeServiceType(id);
  }
  //#endregion ServiceType

  //#region ServiceConcept
  @Post('service-concept')
  @Roles({ id: 'R008' } as Role)
  @ApiOperation({ summary: 'Tạo concept dịch vụ mới' })
  @ApiResponse({ status: 201, description: 'Concept dịch vụ đã được tạo thành công', type: ServiceConcept })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Dữ liệu và tệp của concept dịch vụ',
    schema: {
      type: 'object',
      properties: {
        name: { 
          type: 'string', 
          example: 'Chụp hình cưới ngoại cảnh',
          description: 'Tên của concept dịch vụ'
        },
        description: { 
          type: 'string', 
          example: 'Concept chụp hình cưới ngoại cảnh với phong cách tự nhiên',
          nullable: true,
          description: 'Mô tả chi tiết về concept dịch vụ'
        },
        price: { 
          type: 'number', 
          example: 5000000,
          description: 'Giá của concept dịch vụ'
        },
        duration: { 
          type: 'number', 
          example: 120,
          description: 'Thời gian thực hiện (phút)'
        },
        servicePackageId: { 
          type: 'string', 
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'ID của gói dịch vụ'
        },
        serviceTypeIds: {
          type: 'array',
          items: {
            type: 'string'
          },
          example: ['ST001', 'ST002'],
          description: 'Danh sách ID của các loại dịch vụ'
        },
        status: { 
          type: 'string', 
          enum: Object.values(ServiceConceptStatus), 
          example: ServiceConceptStatus.ACTIVE,
          nullable: true,
          description: 'Trạng thái của concept dịch vụ'
        },
        images: { 
          type: 'array',
          items: {
            type: 'string',
            format: 'binary'
          },
          description: 'Danh sách ảnh của concept dịch vụ (tối đa 10 ảnh)'
        },
      },
      required: ['name', 'price', 'duration', 'servicePackageId', 'serviceTypeIds'],
    },
  })
  async createServiceConcept(
    @Body() createServiceConceptDto: CreateServiceConceptDto,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
  ): Promise<ServiceConcept> {
    const fileMap = {
      images: files.images,
    };
    return this.servicePackageService.createServiceConcept(createServiceConceptDto, fileMap);
  }

  @Get('service-concept')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách tất cả concept dịch vụ' })
  @ApiResponse({ status: 200, description: 'Danh sách concept dịch vụ đã được lấy thành công', type: [ServiceConcept] })
  async findAllServiceConcepts(@Query() query: PaginationDto, @Query('showAll') showAll?: string): Promise<{ data: ServiceConcept[]; pagination: { current: number; pageSize: number; totalPage: number; totalItem: number } }> {
    return this.servicePackageService.findAllServiceConcepts(query, showAll === 'true');
  }

  @Get('service-concept/:id')
  @Public()
  @ApiOperation({ summary: 'Lấy concept dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Concept dịch vụ đã được tìm thấy', type: ServiceConcept })
  @ApiResponse({ status: 404, description: 'Không tìm thấy concept dịch vụ' })
  async findServiceConcept(@Param('id') id: string, @Query('showAll') showAll?: string): Promise<ServiceConcept> {
    return this.servicePackageService.findServiceConcept(id, showAll === 'true');
  }

  @Patch('service-concept/:id')
  // @Roles({ id: 'R008' } as Role)
  @Public()
  @ApiOperation({ summary: 'Cập nhật concept dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Concept dịch vụ đã được cập nhật thành công', type: ServiceConcept })
  @ApiResponse({ status: 404, description: 'Không tìm thấy concept dịch vụ' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Dữ liệu và tệp của concept dịch vụ',
    schema: {
      type: 'object',
      properties: {
        name: { 
          type: 'string', 
          example: 'Chụp hình cưới ngoại cảnh',
          nullable: true,
          description: 'Tên của concept dịch vụ'
        },
        description: { 
          type: 'string', 
          example: 'Concept chụp hình cưới ngoại cảnh với phong cách tự nhiên',
          nullable: true,
          description: 'Mô tả chi tiết về concept dịch vụ'
        },
        price: { 
          type: 'number', 
          example: 5000000,
          nullable: true,
          description: 'Giá của concept dịch vụ'
        },
        duration: { 
          type: 'number', 
          example: 120,
          nullable: true,
          description: 'Thời gian thực hiện (phút)'
        },
        servicePackageId: { 
          type: 'string', 
          example: '123e4567-e89b-12d3-a456-426614174000',
          nullable: true,
          description: 'ID của gói dịch vụ'
        },
        serviceTypeIds: {
          type: 'array',
          items: {
            type: 'string'
          },
          example: ['ST001', 'ST002'],
          nullable: true,
          description: 'Danh sách ID của các loại dịch vụ'
        },
        status: { 
          type: 'string', 
          enum: Object.values(ServiceConceptStatus), 
          example: ServiceConceptStatus.ACTIVE,
          nullable: true,
          description: 'Trạng thái của concept dịch vụ'
        },
        images: { 
          type: 'array',
          items: {
            type: 'string',
            format: 'binary'
          },
          nullable: true,
          description: 'Danh sách ảnh của concept dịch vụ (tối đa 10 ảnh)'
        },
      },
    },
  })
  async updateServiceConcept(
    @Param('id') id: string,
    @Body() updateServiceConceptDto: UpdateServiceConceptDto,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
  ): Promise<ServiceConcept> {
    const fileMap = {
      images: files.images,
    };
    return this.servicePackageService.updateServiceConcept(id, updateServiceConceptDto, fileMap);
  }

  @Delete('service-concept/:id')
  @Roles({ id: 'R008' } as Role)
  @ApiOperation({ summary: 'Xóa concept dịch vụ theo ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Concept dịch vụ đã được xóa thành công',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
          description: 'Trạng thái thành công'
        },
        message: {
          type: 'string',
          example: 'Concept dịch vụ đã được xóa thành công',
          description: 'Thông báo kết quả'
        },
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy concept dịch vụ' })
  async removeServiceConcept(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.servicePackageService.removeServiceConcept(id);
      this.logger.log(`Concept dịch vụ ${id} đã được xóa thành công`);
      return {
        success: true,
        message: `Concept dịch vụ ${id} đã được xóa thành công`,
      };
    } catch (error) {
      this.logger.error(`Lỗi khi xóa concept dịch vụ ${id}: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }
  //#endregion ServiceConcept

  //#region ServiceConceptServiceType
  @Post('service-concept-service-type')
  @Roles({ id: 'R008' } as Role)
  @ApiOperation({ summary: 'Tạo liên kết concept dịch vụ và loại dịch vụ' })
  @ApiResponse({ status: 201, description: 'Liên kết đã được tạo thành công', type: ServiceConceptServiceType })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async createServiceConceptServiceType(@Body() dto: CreateServiceConceptServiceTypeDto): Promise<ServiceConceptServiceType> {
    return this.servicePackageService.createServiceConceptServiceType(dto);
  }

  @Get('service-concept-service-type')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách tất cả liên kết concept dịch vụ và loại dịch vụ' })
  @ApiResponse({ status: 200, description: 'Danh sách liên kết đã được lấy thành công', type: [ServiceConceptServiceType] })
  async findAllServiceConceptServiceType(@Query() query: PaginationDto, @Query('showAll') showAll?: string): Promise<{ data: ServiceConceptServiceType[]; pagination: { current: number; pageSize: number; totalPage: number; totalItem: number } }> {
    return this.servicePackageService.findAllServiceConceptServiceType(query, showAll === 'true');
  }

  @Get('service-concept-service-type/:serviceConceptId/:serviceTypeId')
  @Public()
  @ApiOperation({ summary: 'Lấy liên kết concept dịch vụ và loại dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Liên kết đã được tìm thấy', type: ServiceConceptServiceType })
  @ApiResponse({ status: 404, description: 'Không tìm thấy liên kết' })
  async findServiceConceptServiceType(
    @Param('serviceConceptId') serviceConceptId: string,
    @Param('serviceTypeId') serviceTypeId: string,
    @Query('showAll') showAll?: string,
  ): Promise<ServiceConceptServiceType> {
    return this.servicePackageService.findServiceConceptServiceType(serviceConceptId, serviceTypeId, showAll === 'true');
  }

  @Patch('service-concept-service-type/:serviceConceptId/:serviceTypeId')
  @Roles({ id: 'R008' } as Role)
  @ApiOperation({ summary: 'Cập nhật liên kết concept dịch vụ và loại dịch vụ' })
  @ApiResponse({ status: 200, description: 'Liên kết đã được cập nhật thành công', type: ServiceConceptServiceType })
  @ApiResponse({ status: 404, description: 'Không tìm thấy liên kết' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async updateServiceConceptServiceType(
    @Param('serviceConceptId') serviceConceptId: string,
    @Param('serviceTypeId') serviceTypeId: string,
    @Body() dto: UpdateServiceConceptServiceTypeDto,
  ): Promise<ServiceConceptServiceType> {
    return this.servicePackageService.updateServiceConceptServiceType(serviceConceptId, serviceTypeId, dto);
  }

  @Delete('service-concept-service-type/:serviceConceptId/:serviceTypeId')
  @Roles({ id: 'R008' } as Role)
  @ApiOperation({ summary: 'Xóa liên kết concept dịch vụ và loại dịch vụ' })
  @ApiResponse({ status: 200, description: 'Liên kết đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy liên kết' })
  async removeServiceConceptServiceType(
    @Param('serviceConceptId') serviceConceptId: string,
    @Param('serviceTypeId') serviceTypeId: string,
  ): Promise<void> {
    return this.servicePackageService.removeServiceConceptServiceType(serviceConceptId, serviceTypeId);
  }
  //#endregion ServiceConceptServiceType

  //#region ServicePackage - Dynamic Routes
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Lấy gói dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Gói dịch vụ đã được tìm thấy', type: ServicePackage })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói dịch vụ' })
  async findOne(@Param('id') id: string, @Query('showAll') showAll?: string): Promise<ServicePackage> {
    return this.servicePackageService.findOne(id, showAll === 'true');
  }

  @Patch(':id')
  @Roles({ id: 'R008' } as Role)
  @ApiOperation({ summary: 'Cập nhật gói dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Gói dịch vụ đã được cập nhật thành công', type: ServicePackage })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói dịch vụ' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Dữ liệu và tệp của gói dịch vụ',
    schema: {
      type: 'object',
      properties: {
        name: { 
          type: 'string', 
          example: 'Gói chụp ảnh cưới cao cấp',
          description: 'Tên của gói dịch vụ'
        },
        description: { 
          type: 'string', 
          example: 'Gói chụp ảnh cưới cao cấp bao gồm: 200 ảnh, 2 album, 1 video highlight',
          nullable: true,
          description: 'Mô tả chi tiết về gói dịch vụ'
        },
        vendorId: { 
          type: 'string', 
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'ID của nhà cung cấp dịch vụ'
        },
        status: { 
          type: 'string', 
          enum: Object.values(ServicePackageStatus), 
          example: ServicePackageStatus.ACTIVE,
          nullable: true,
          description: 'Trạng thái của gói dịch vụ'
        },
        image: { 
          type: 'string', 
          format: 'binary',
          description: 'Ảnh đại diện của gói dịch vụ'
        },
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() updateServicePackageDto: UpdateServicePackageDto,
    @UploadedFiles() files: { image?: Express.Multer.File[] },
  ): Promise<ServicePackage> {
    const fileMap = {
      image: files.image?.[0],
    };
    return this.servicePackageService.update(id, updateServicePackageDto, fileMap);
  }

  @Delete(':id')
  @Roles({ id: 'R008' } as Role)
  @ApiOperation({ summary: 'Xóa gói dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Gói dịch vụ đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói dịch vụ' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.servicePackageService.remove(id);
  }
  //#endregion ServicePackage - Dynamic Routes
}