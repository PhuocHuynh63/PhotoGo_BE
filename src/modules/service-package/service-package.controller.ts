import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ServicePackageService } from './service-package.service';
import {
  CreateServicePackageDto,
  CreateServicePackageMetadataDto,
  CreateServicePackagePriceOverrideDto,
  CreateServicePackageServiceTypeDto,
  CreateServiceTypeDto
} from './dto/create-service-package.dto';
import {
  UpdateServicePackageDto,
  UpdateServicePackageMetadataDto,
  UpdateServicePackagePriceOverrideDto,
  UpdateServicePackageServiceTypeDto,
  UpdateServiceTypeDto
} from './dto/update-service-package.dto';
import { ServicePackage } from './entities/service-package.entity';
import { ServicePackageMetadata } from './entities/service-package-metadata.entity';
import { ServicePackagePriceOverride } from './entities/service-package-price-override.entity';
import { ServicePackageServiceType } from './entities/service-package-service-type.entity';
import { ServiceType } from './entities/service-type.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Service Packages')
@Controller('service-packages')
@ApiBearerAuth('access-token')
export class ServicePackageController {
  constructor(private readonly servicePackageService: ServicePackageService) {}

  //#region ServicePackageMetadata
  @Post('metadata')
  @ApiOperation({ summary: 'Tạo metadata cho gói dịch vụ' })
  @ApiResponse({ status: 201, description: 'Metadata đã được tạo thành công', type: ServicePackageMetadata })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async createMetadata(@Body() dto: CreateServicePackageMetadataDto): Promise<ServicePackageMetadata> {
    return this.servicePackageService.createMetadata(dto);
  }

  @Get('metadata')
  @ApiOperation({ summary: 'Lấy danh sách tất cả metadata' })
  @ApiResponse({ status: 200, description: 'Danh sách metadata đã được lấy thành công', type: [ServicePackageMetadata] })
  async findAllMetadata(): Promise<ServicePackageMetadata[]> {
    return this.servicePackageService.findAllMetadata();
  }

  @Get('metadata/:id')
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
  async updateMetadata(
    @Param('id') id: string,
    @Body() dto: UpdateServicePackageMetadataDto,
  ): Promise<ServicePackageMetadata> {
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

  //#region ServicePackagePriceOverride
  @Post('price-override')
  @ApiOperation({ summary: 'Tạo giá ghi đè cho gói dịch vụ' })
  @ApiResponse({ status: 201, description: 'Giá ghi đè đã được tạo thành công', type: ServicePackagePriceOverride })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async createPriceOverride(@Body() dto: CreateServicePackagePriceOverrideDto): Promise<ServicePackagePriceOverride> {
    return this.servicePackageService.createPriceOverride(dto);
  }

  @Get('price-override')
  @ApiOperation({ summary: 'Lấy danh sách tất cả giá ghi đè' })
  @ApiResponse({ status: 200, description: 'Danh sách giá ghi đè đã được lấy thành công', type: [ServicePackagePriceOverride] })
  async findAllPriceOverrides(): Promise<ServicePackagePriceOverride[]> {
    return this.servicePackageService.findAllPriceOverrides();
  }

  @Get('price-override/:id')
  @ApiOperation({ summary: 'Lấy giá ghi đè theo ID' })
  @ApiResponse({ status: 200, description: 'Giá ghi đè đã được tìm thấy', type: ServicePackagePriceOverride })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giá ghi đè' })
  async findPriceOverride(@Param('id') id: string): Promise<ServicePackagePriceOverride> {
    return this.servicePackageService.findPriceOverride(id);
  }

  @Patch('price-override/:id')
  @ApiOperation({ summary: 'Cập nhật giá ghi đè theo ID' })
  @ApiResponse({ status: 200, description: 'Giá ghi đè đã được cập nhật thành công', type: ServicePackagePriceOverride })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giá ghi đè' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async updatePriceOverride(
    @Param('id') id: string,
    @Body() dto: UpdateServicePackagePriceOverrideDto,
  ): Promise<ServicePackagePriceOverride> {
    return this.servicePackageService.updatePriceOverride(id, dto);
  }

  @Delete('price-override/:id')
  @ApiOperation({ summary: 'Xóa giá ghi đè theo ID' })
  @ApiResponse({ status: 200, description: 'Giá ghi đè đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giá ghi đè' })
  async removePriceOverride(@Param('id') id: string): Promise<void> {
    return this.servicePackageService.removePriceOverride(id);
  }
  //#endregion ServicePackagePriceOverride

  //#region ServicePackageServiceType
  @Post('service-package-service-type')
  @ApiOperation({ summary: 'Tạo liên kết gói dịch vụ với loại dịch vụ' })
  @ApiResponse({ status: 201, description: 'Liên kết đã được tạo thành công', type: ServicePackageServiceType })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async createServicePackageServiceType(@Body() dto: CreateServicePackageServiceTypeDto): Promise<ServicePackageServiceType> {
    return this.servicePackageService.createServicePackageServiceType(dto);
  }

  @Get('service-package-service-type')
  @ApiOperation({ summary: 'Lấy danh sách tất cả liên kết gói dịch vụ với loại dịch vụ' })
  @ApiResponse({ status: 200, description: 'Danh sách liên kết đã được lấy thành công', type: [ServicePackageServiceType] })
  async findAllServicePackageServiceType(): Promise<ServicePackageServiceType[]> {
    return this.servicePackageService.findAllServicePackageServiceType();
  }

  @Get('service-package-service-type/:servicePackageId/:serviceTypeId')
  @ApiOperation({ summary: 'Lấy liên kết gói dịch vụ với loại dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Liên kết đã được tìm thấy', type: ServicePackageServiceType })
  @ApiResponse({ status: 404, description: 'Không tìm thấy liên kết' })
  async findServicePackageServiceType(
    @Param('servicePackageId') servicePackageId: string,
    @Param('serviceTypeId') serviceTypeId: string,
  ): Promise<ServicePackageServiceType> {
    return this.servicePackageService.findServicePackageServiceType(servicePackageId, serviceTypeId);
  }

  @Patch('service-package-service-type/:servicePackageId/:serviceTypeId')
  @ApiOperation({ summary: 'Cập nhật liên kết gói dịch vụ với loại dịch vụ' })
  @ApiResponse({ status: 200, description: 'Liên kết đã được cập nhật thành công', type: ServicePackageServiceType })
  @ApiResponse({ status: 404, description: 'Không tìm thấy liên kết' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async updateServicePackageServiceType(
    @Param('servicePackageId') servicePackageId: string,
    @Param('serviceTypeId') serviceTypeId: string,
    @Body() dto: UpdateServicePackageServiceTypeDto,
  ): Promise<ServicePackageServiceType> {
    return this.servicePackageService.updateServicePackageServiceType(servicePackageId, serviceTypeId, dto);
  }

  @Delete('service-package-service-type/:servicePackageId/:serviceTypeId')
  @ApiOperation({ summary: 'Xóa liên kết gói dịch vụ với loại dịch vụ' })
  @ApiResponse({ status: 200, description: 'Liên kết đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy liên kết' })
  async removeServicePackageServiceType(
    @Param('servicePackageId') servicePackageId: string,
    @Param('serviceTypeId') serviceTypeId: string,
  ): Promise<void> {
    return this.servicePackageService.removeServicePackageServiceType(servicePackageId, serviceTypeId);
  }
  //#endregion ServicePackageServiceType

  //#region ServiceType
  @Post('service-type')
  @ApiOperation({ summary: 'Tạo loại dịch vụ mới' })
  @ApiResponse({ status: 201, description: 'Loại dịch vụ đã được tạo thành công', type: ServiceType })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async createServiceType(@Body() dto: CreateServiceTypeDto): Promise<ServiceType> {
    return this.servicePackageService.createServiceType(dto);
  }

  @Get('service-type')
  @ApiOperation({ summary: 'Lấy danh sách tất cả loại dịch vụ' })
  @ApiResponse({ status: 200, description: 'Danh sách loại dịch vụ đã được lấy thành công', type: [ServiceType] })
  async findAllServiceType(): Promise<ServiceType[]> {
    return this.servicePackageService.findAllServiceTypes();
  }

  @Get('service-type/:id')
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
  async updateServiceType(
    @Param('id') id: string,
    @Body() dto: UpdateServiceTypeDto,
  ): Promise<ServiceType> {
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

  //#region ServicePackage
  @Post()
  @ApiOperation({ summary: 'Tạo gói dịch vụ mới' })
  @ApiResponse({ status: 201, description: 'Gói dịch vụ đã được tạo thành công', type: ServicePackage })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async create(@Body() createServicePackageDto: CreateServicePackageDto): Promise<ServicePackage> {
    return this.servicePackageService.create(createServicePackageDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả gói dịch vụ' })
  @ApiResponse({ status: 200, description: 'Danh sách gói dịch vụ đã được lấy thành công', type: [ServicePackage] })
  async findAll(): Promise<ServicePackage[]> {
    return this.servicePackageService.findAll();
  }

  @Get(':id')
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
  async update(
    @Param('id') id: string,
    @Body() updateServicePackageDto: UpdateServicePackageDto,
  ): Promise<ServicePackage> {
    return this.servicePackageService.update(id, updateServicePackageDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa gói dịch vụ theo ID' })
  @ApiResponse({ status: 200, description: 'Gói dịch vụ đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói dịch vụ' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.servicePackageService.remove(id);
  }
  //#endregion ServicePackage
}
