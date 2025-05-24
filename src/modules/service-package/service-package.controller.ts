import { Controller, Get, Post, Patch, Param, Delete, Body, UseInterceptors, UploadedFiles, UseGuards, Query } from '@nestjs/common';
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

@ApiTags('Service Packages')
@Controller('service-packages')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServicePackageController {
  constructor(private readonly servicePackageService: ServicePackageService) {}

  //#region ServicePackage - Static Routes
  @Post()
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
  async findAll(): Promise<{ data: ServicePackage[]; pagination: { current: number; pageSize: number; totalPage: number; totalItem: number } }> {
    return this.servicePackageService.findAll();
  }
  //#endregion ServicePackage - Static Routes

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
  async findAllMetadata(): Promise<{ data: ServicePackageMetadata[]; pagination: { current: number; pageSize: number; totalPage: number; totalItem: number } }> {
    return this.servicePackageService.findAllMetadata();
  }

  @Get('metadata/:id')
  @Public()
  @ApiOperation({ summary: 'Lấy metadata theo ID' })
  @ApiResponse({ status: 200, description: 'Metadata đã được tìm thấy', type: ServicePackageMetadata })
  @ApiResponse({ status: 404, description: 'Không tìm thấy metadata' })
  async findMetadata(@Param('id') id: string): Promise<ServicePackageMetadata> {
    return this.servicePackageService.findMetadata(id);
  }

  @Patch('metadata/:id')
  @ApiOperation({ summary: 'Cập nhật metadata theo ID' })
  @ApiResponse({ status: 200, description: 'Metadata đã được cập nhật thành công', type: ServicePackageMetadata })
  @ApiResponse({ status: 404, description: 'Không tìm thấy metadata' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async updateMetadata(@Param('id') id: string, @Body() dto: UpdateServicePackageMetadataDto): Promise<ServicePackageMetadata> {
    return this.servicePackageService.updateMetadata(id, dto);
  }

  @Delete('metadata/:id')
  @ApiOperation({ summary: 'Xóa metadata theo ID' })
  @ApiResponse({ status: 200, description: 'Metadata đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy metadata' })
  async removeMetadata(@Param('id') id: string): Promise<void> {
    return this.servicePackageService.removeMetadata(id);
  }
  //#endregion ServicePackageMetadata

  //#region ServiceType
  @Post('service-type')
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
  async findAllServiceType(): Promise<{ data: ServiceType[]; pagination: { current: number; pageSize: number; totalPage: number; totalItem: number } }> {
    return this.servicePackageService.findAllServiceTypes();
  }

  @Get('service-type/:id')
  @Public()
  @ApiOperation({ summary: 'Lấy loại dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Loại dịch vụ đã được tìm thấy', type: ServiceType })
  @ApiResponse({ status: 404, description: 'Không tìm thấy loại dịch vụ' })
  async findServiceType(@Param('id') id: string): Promise<ServiceType> {
    return this.servicePackageService.findServiceType(id);
  }

  @Patch('service-type/:id')
  @ApiOperation({ summary: 'Cập nhật loại dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Loại dịch vụ đã được cập nhật thành công', type: ServiceType })
  @ApiResponse({ status: 404, description: 'Không tìm thấy loại dịch vụ' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async updateServiceType(@Param('id') id: string, @Body() dto: UpdateServiceTypeDto): Promise<ServiceType> {
    return this.servicePackageService.updateServiceType(id, dto);
  }

  @Delete('service-type/:id')
  @ApiOperation({ summary: 'Xóa loại dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Loại dịch vụ đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy loại dịch vụ' })
  async removeServiceType(@Param('id') id: string): Promise<void> {
    return this.servicePackageService.removeServiceType(id);
  }
  //#endregion ServiceType

  //#region ServiceConcept
  @Post('service-concept')
  @ApiOperation({ summary: 'Tạo khái niệm dịch vụ mới' })
  @ApiResponse({ status: 201, description: 'Khái niệm dịch vụ đã được tạo thành công', type: ServiceConcept })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }]))  @ApiConsumes('multipart/form-data')  @ApiBody({    description: 'Dữ liệu và tệp của khái niệm dịch vụ',    schema: {      type: 'object',      properties: {        name: { type: 'string', example: 'Chụp ảnh cưới cơ bản' },        description: { type: 'string', nullable: true },        servicePackageId: { type: 'string', example: 'uuid', nullable: true },        price: { type: 'number', example: 1000000 },        duration: { type: 'number', example: 60 },        status: { type: 'string', enum: ['hoạt động', 'không hoạt động'], nullable: true },        serviceTypeIds: {          type: 'array',          items: { type: 'string' },          example: ['uuid1', 'uuid2'],          nullable: true,        },        images: {           type: 'array',          items: {            type: 'string',            format: 'binary'          },          description: 'Multiple images can be uploaded (max 10)'        },      },      required: ['name', 'price', 'duration'],    },  })
    async createServiceConcept(    @Body() createServiceConceptDto: CreateServiceConceptDto,    @UploadedFiles() files: { images?: Express.Multer.File[] },  ): Promise<ServiceConcept> {    const fileMap = {      images: files.images,    };
    return this.servicePackageService.createServiceConcept(createServiceConceptDto, fileMap);
  }

  @Get('service-concept')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách tất cả khái niệm dịch vụ' })
  @ApiResponse({ status: 200, description: 'Danh sách khái niệm dịch vụ đã được lấy thành công', type: [ServiceConcept] })
  async findAllServiceConcepts(): Promise<{ data: ServiceConcept[]; pagination: { current: number; pageSize: number; totalPage: number; totalItem: number } }> {
    return this.servicePackageService.findAllServiceConcepts();
  }

  @Get('service-concept/:id')
  @Public()
  @ApiOperation({ summary: 'Lấy khái niệm dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Khái niệm dịch vụ đã được tìm thấy', type: ServiceConcept })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khái niệm dịch vụ' })
  async findServiceConcept(@Param('id') id: string): Promise<ServiceConcept> {
    return this.servicePackageService.findServiceConcept(id);
  }

  @Patch('service-concept/:id')
  @ApiOperation({ summary: 'Cập nhật khái niệm dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Khái niệm dịch vụ đã được cập nhật thành công', type: ServiceConcept })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khái niệm dịch vụ' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }]))  @ApiConsumes('multipart/form-data')  @ApiBody({    description: 'Cập nhật dữ liệu và tệp của khái niệm dịch vụ',    schema: {      type: 'object',      properties: {        name: { type: 'string', example: 'Chụp ảnh cưới cơ bản' },        description: { type: 'string', nullable: true },        price: { type: 'number', example: 1000000 },        duration: { type: 'number', example: 60 },        status: { type: 'string', enum: ['hoạt động', 'không hoạt động'], nullable: true },        serviceTypeIds: {          type: 'array',          items: { type: 'string' },          example: ['uuid1', 'uuid2'],          nullable: true,        },        images: {           type: 'array',          items: {            type: 'string',            format: 'binary'          },          description: 'Multiple images can be uploaded (max 10)'        },      },    },  })
    async updateServiceConcept(    @Param('id') id: string,    @Body() updateServiceConceptDto: UpdateServiceConceptDto,    @UploadedFiles() files: { images?: Express.Multer.File[] },  ): Promise<ServiceConcept> {    const fileMap = {      images: files.images,    };
    return this.servicePackageService.updateServiceConcept(id, updateServiceConceptDto, fileMap);
  }

  @Delete('service-concept/:id')
  @ApiOperation({ summary: 'Xóa khái niệm dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Khái niệm dịch vụ đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khái niệm dịch vụ' })
  async removeServiceConcept(@Param('id') id: string): Promise<void> {
    return this.servicePackageService.removeServiceConcept(id);
  }
  //#endregion ServiceConcept

  //#region ServiceConceptServiceType
  @Post('service-concept-service-type')
  @ApiOperation({ summary: 'Tạo liên kết gói dịch vụ với loại dịch vụ' })
  @ApiResponse({ status: 201, description: 'Liên kết đã được tạo thành công', type: ServiceConceptServiceType })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async createServiceConceptServiceType(@Body() dto: CreateServiceConceptServiceTypeDto): Promise<ServiceConceptServiceType> {
    return this.servicePackageService.createServiceConceptServiceType(dto);
  }

  @Get('service-concept-service-type')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách tất cả liên kết gói dịch vụ với loại dịch vụ' })
  @ApiResponse({ status: 200, description: 'Danh sách liên kết đã được lấy thành công', type: [ServiceConceptServiceType] })
  async findAllServiceConceptServiceType(): Promise<{ data: ServiceConceptServiceType[]; pagination: { current: number; pageSize: number; totalPage: number; totalItem: number } }> {
    return this.servicePackageService.findAllServiceConceptServiceType();
  }

  @Get('service-concept-service-type/:serviceConceptId/:serviceTypeId')
  @Public()
  @ApiOperation({ summary: 'Lấy liên kết gói dịch vụ với loại dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Liên kết đã được tìm thấy', type: ServiceConceptServiceType })
  @ApiResponse({ status: 404, description: 'Không tìm thấy liên kết' })
  async findServiceConceptServiceType(
    @Param('serviceConceptId') serviceConceptId: string,
    @Param('serviceTypeId') serviceTypeId: string,
  ): Promise<ServiceConceptServiceType> {
    return this.servicePackageService.findServiceConceptServiceType(serviceConceptId, serviceTypeId);
  }

  @Patch('service-concept-service-type/:serviceConceptId/:serviceTypeId')
  @ApiOperation({ summary: 'Cập nhật liên kết gói dịch vụ với loại dịch vụ' })
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
  @ApiOperation({ summary: 'Xóa liên kết gói dịch vụ với loại dịch vụ' })
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
  async findOne(@Param('id') id: string): Promise<ServicePackage> {
    return this.servicePackageService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật gói dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Gói dịch vụ đã được cập nhật thành công', type: ServicePackage })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói dịch vụ' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Cập nhật dữ liệu và tệp của gói dịch vụ',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Gói dịch vụ cơ bản' },
        description: { type: 'string', nullable: true },
        status: { type: 'string', enum: Object.values(ServicePackageStatus), nullable: true },
        serviceConceptIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['uuid1', 'uuid2'],
          nullable: true,
        },
        image: { type: 'string', format: 'binary' },
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
  @ApiOperation({ summary: 'Xóa gói dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Gói dịch vụ đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói dịch vụ' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.servicePackageService.remove(id);
  }
  //#endregion ServicePackage - Dynamic Routes


}