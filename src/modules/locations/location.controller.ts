import { Controller, Get, Post, Put, Delete, Body, Query, Param, HttpException, HttpStatus } from '@nestjs/common';
import { LocationService } from './location.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { Location } from './entities/location.entity';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { FindLocationDto } from './dto/find-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { SearchLocationDto } from './dto/search-location.dto';

@ApiTags('Locations')
@Controller('locations')
@ApiBearerAuth('access-token')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Tạo địa điểm mới (Protected)',
    description: 'Tạo một địa điểm mới với thông tin vendor và địa chỉ'
  })
  @ApiBody({
    type: CreateLocationDto,
    description: 'Thông tin địa điểm cần tạo',
    examples: {
      example1: {
        summary: 'Tạo địa điểm với đầy đủ thông tin',
        value: {
          vendor_id: '97004449-52d9-4a49-b071-ce5786f7645e',
          address: '321 Phạm Văn Đồng',
          district: 'Thủ Đức',
          ward: 'Linh Tây',
          city: 'Hồ Chí Minh',
          province: 'Hồ Chí Minh',
          latitude: 10.849100,
          longitude: 106.772400
        }
      },
      example2: {
        summary: 'Tạo địa điểm không có tọa độ',
        value: {
          vendor_id: '97004449-52d9-4a49-b071-ce5786f7645e',
          address: '321 Phạm Văn Đồng',
          district: 'Thủ Đức',
          ward: 'Linh Tây',
          city: 'Hồ Chí Minh',
          province: 'Hồ Chí Minh'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Địa điểm được tạo thành công', type: Location })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Không được phép truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vendor' })
  @ResponseMessage('Tạo địa điểm thành công') 
  async create(@Body() createLocationDto: CreateLocationDto): Promise<Location> {
    try {
      return await this.locationService.create(createLocationDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi tạo địa điểm', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy tất cả địa điểm (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách địa điểm với phân trang',
    type: [Location],
  })
  @ApiResponse({ status: 400, description: 'Tham số tìm kiếm không hợp lệ' })
  @ResponseMessage('Lấy danh sách địa điểm thành công')
  async findAll(@Query() query: FindLocationDto): Promise<{
    data: Location[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    try {
      return await this.locationService.findAll(query);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi lấy danh sách địa điểm', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Lấy địa điểm theo ID (Public)' })
  @ApiResponse({ status: 200, description: 'Địa điểm được tìm thấy', type: Location })
  @ApiResponse({ status: 400, description: 'ID không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy địa điểm' })
  @ResponseMessage('Lấy thông tin địa điểm thành công')
  async findOne(@Param('id') id: string): Promise<Location> {
    if (!id) {
      throw new HttpException('ID địa điểm không được để trống', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.locationService.findOne(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi lấy thông tin địa điểm', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật địa điểm theo ID' })
  @ApiResponse({ status: 200, description: 'Địa điểm được cập nhật thành công', type: Location })
  @ApiResponse({ status: 400, description: 'Dữ liệu cập nhật không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Không được phép truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy địa điểm' })
  @ResponseMessage('Cập nhật địa điểm thành công')
  async updateLocation(@Param('id') id: string, @Body() updateLocationDto: UpdateLocationDto): Promise<Location> {
    if (!id) {
      throw new HttpException('ID địa điểm không được để trống', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.locationService.updateLocation(id, updateLocationDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi cập nhật địa điểm', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa địa điểm theo ID' })
  @ApiResponse({ status: 200, description: 'Địa điểm được xóa thành công' })
  @ApiResponse({ status: 400, description: 'ID không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Không được phép truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy địa điểm' })
  @ResponseMessage('Xóa địa điểm thành công')
  async deleteLocation(@Param('id') id: string): Promise<void> {
    if (!id) {
      throw new HttpException('ID địa điểm không được để trống', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.locationService.deleteLocation(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi xóa địa điểm', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Tìm kiếm địa điểm' })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách địa điểm tìm được',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Location' }
        },
        total: { type: 'number' }
      }
    }
  })
  @ResponseMessage('Tìm kiếm địa điểm thành công')
  async searchLocations(@Query() searchDto: SearchLocationDto) {
    return await this.locationService.searchLocations(searchDto);
  }
}