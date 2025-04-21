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
  async createMetadata(@Body() dto: CreateServicePackageMetadataDto): Promise<ServicePackageMetadata> {
    return this.servicePackageService.createMetadata(dto);
  }

  @Get('metadata')
  async findAllMetadata(): Promise<ServicePackageMetadata[]> {
    return this.servicePackageService.findAllMetadata();
  }

  @Get('metadata/:id')
  async findMetadata(@Param('id') id: string): Promise<ServicePackageMetadata> {
    return this.servicePackageService.findMetadata(id);
  }

  @Patch('metadata/:id')
  async updateMetadata(
    @Param('id') id: string,
    @Body() dto: UpdateServicePackageMetadataDto,
  ): Promise<ServicePackageMetadata> {
    return this.servicePackageService.updateMetadata(id, dto);
  }

  @Delete('metadata/:id')
  async removeMetadata(@Param('id') id: string): Promise<void> {
    return this.servicePackageService.removeMetadata(id);
  }
  //#endregion ServicePackageMetadata

  //#region ServicePackagePriceOverride
  @Post('price-override')
  async createPriceOverride(@Body() dto: CreateServicePackagePriceOverrideDto): Promise<ServicePackagePriceOverride> {
    return this.servicePackageService.createPriceOverride(dto);
  }

  @Get('price-override')
  async findAllPriceOverrides(): Promise<ServicePackagePriceOverride[]> {
    return this.servicePackageService.findAllPriceOverrides();
  }

  @Get('price-override/:id')
  async findPriceOverride(@Param('id') id: string): Promise<ServicePackagePriceOverride> {
    return this.servicePackageService.findPriceOverride(id);
  }

  @Patch('price-override/:id')
  async updatePriceOverride(
    @Param('id') id: string,
    @Body() dto: UpdateServicePackagePriceOverrideDto,
  ): Promise<ServicePackagePriceOverride> {
    return this.servicePackageService.updatePriceOverride(id, dto);
  }

  @Delete('price-override/:id')
  async removePriceOverride(@Param('id') id: string): Promise<void> {
    return this.servicePackageService.removePriceOverride(id);
  }
  //#endregion ServicePackagePriceOverride

  //#region ServicePackageServiceType
  @Post('service-package-service-type')
  async createServicePackageServiceType(@Body() dto: CreateServicePackageServiceTypeDto): Promise<ServicePackageServiceType> {
    return this.servicePackageService.createServicePackageServiceType(dto);
  }

  @Get('service-package-service-type')
  async findAllServicePackageServiceType(): Promise<ServicePackageServiceType[]> {
    return this.servicePackageService.findAllServicePackageServiceType();
  }

  @Get('service-package-service-type/:servicePackageId/:serviceTypeId')
  async findServicePackageServiceType(
    @Param('servicePackageId') servicePackageId: string,
    @Param('serviceTypeId') serviceTypeId: string,
  ): Promise<ServicePackageServiceType> {
    return this.servicePackageService.findServicePackageServiceType(servicePackageId, serviceTypeId);
  }

  @Patch('service-package-service-type/:servicePackageId/:serviceTypeId')
  async updateServicePackageServiceType(
    @Param('servicePackageId') servicePackageId: string,
    @Param('serviceTypeId') serviceTypeId: string,
    @Body() dto: UpdateServicePackageServiceTypeDto,
  ): Promise<ServicePackageServiceType> {
    return this.servicePackageService.updateServicePackageServiceType(servicePackageId, serviceTypeId, dto);
  }

  @Delete('service-package-service-type/:servicePackageId/:serviceTypeId')
  async removeServicePackageServiceType(
    @Param('servicePackageId') servicePackageId: string,
    @Param('serviceTypeId') serviceTypeId: string,
  ): Promise<void> {
    return this.servicePackageService.removeServicePackageServiceType(servicePackageId, serviceTypeId);
  }
  //#endregion ServicePackageServiceType

  //#region ServiceType
  @Post('service-type')
  async createServiceType(@Body() dto: CreateServiceTypeDto): Promise<ServiceType> {
    return this.servicePackageService.createServiceType(dto);
  }

  @Get('service-type')
  async findAllServiceType(): Promise<ServiceType[]> {
    return this.servicePackageService.findAllServiceTypes();
  }

  @Get('service-type/:id')
  async findServiceType(@Param('id') id: string): Promise<ServiceType> {
    return this.servicePackageService.findServiceType(id);
  }

  @Patch('service-type/:id')
  async updateServiceType(
    @Param('id') id: string,
    @Body() dto: UpdateServiceTypeDto,
  ): Promise<ServiceType> {
    return this.servicePackageService.updateServiceType(id, dto);
  }

  @Delete('service-type/:id')
  async removeServiceType(@Param('id') id: string): Promise<void> {
    return this.servicePackageService.removeServiceType(id);
  }
  //#endregion ServiceType

  //#region ServicePackage
  @Post()
  @ApiOperation({ summary: 'Create a new service package' })
  @ApiResponse({ status: 201, description: 'Service package created successfully', type: ServicePackage })
  async create(@Body() createServicePackageDto: CreateServicePackageDto): Promise<ServicePackage> {
    return this.servicePackageService.create(createServicePackageDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all service packages' })
  @ApiResponse({ status: 200, description: 'List of all service packages', type: [ServicePackage] })
  async findAll(): Promise<ServicePackage[]> {
    return this.servicePackageService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service package by ID' })
  @ApiResponse({ status: 200, description: 'Service package updated successfully', type: ServicePackage })
  @ApiResponse({ status: 404, description: 'Service package not found' })
  async update(
    @Param('id') id: string,
    @Body() updateServicePackageDto: UpdateServicePackageDto,
  ): Promise<ServicePackage> {
    return this.servicePackageService.update(id, updateServicePackageDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a service package by ID' })
  @ApiResponse({ status: 200, description: 'Service package deleted successfully' })
  @ApiResponse({ status: 404, description: 'Service package not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.servicePackageService.remove(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service package by ID' })
  @ApiResponse({ status: 200, description: 'Service package found', type: ServicePackage })
  @ApiResponse({ status: 404, description: 'Service package not found' })
  async findOne(@Param('id') id: string): Promise<ServicePackage> {
    return this.servicePackageService.findOne(id);
  }
  //#endregion ServicePackage
}
