import { Controller, Get, Post, Put, Delete, Body, Query, Param, Res } from '@nestjs/common';
import { LocationService } from './location.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { Location } from './entities/location.entity';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { FindLocationDto } from './dto/find-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

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
  @ApiResponse({ status: 401, description: 'Không được phép truy cập' })
  @ResponseMessage('Tạo địa điểm thành công') 
  async create(@Body() createLocationDto: CreateLocationDto): Promise<Location> {
    return this.locationService.create(createLocationDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy tất cả địa điểm (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách địa điểm với phân trang',
    type: [Location],
  })
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
    return this.locationService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Lấy địa điểm theo ID (Public)' })
  @ApiResponse({ status: 200, description: 'Địa điểm được tìm thấy', type: Location })
  @ApiResponse({ status: 404, description: 'Không tìm thấy địa điểm' })
  @ResponseMessage('Lấy thông tin địa điểm thành công')
  async findOne(@Param('id') id: string): Promise<Location> {
    return this.locationService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật địa điểm theo ID' })
  @ApiResponse({ status: 200, description: 'Địa điểm được cập nhật thành công', type: Location })
  @ApiResponse({ status: 404, description: 'Không tìm thấy địa điểm' })
  async updateLocation(@Param('id') id: string, @Body() updateLocationDto: UpdateLocationDto): Promise<Location> {
    return await this.locationService.updateLocation(id, updateLocationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa địa điểm theo ID' })
  @ApiResponse({ status: 200, description: 'Địa điểm được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy địa điểm' })
  async deleteLocation(@Param('id') id: string): Promise<void> {
    return await this.locationService.deleteLocation(id);
  }
}