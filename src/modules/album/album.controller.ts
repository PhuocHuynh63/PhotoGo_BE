import { Body, Controller, Delete, Get, Param, Post, Put, BadRequestException, Query } from '@nestjs/common';
import { AlbumService } from './album.service';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { ApiTags, ApiBody, ApiResponse, ApiOperation, ApiParam, ApiOkResponse, ApiCreatedResponse, ApiBadRequestResponse, ApiNotFoundResponse, ApiQuery } from '@nestjs/swagger';
import { AlbumPaginationDto } from './dto/pagination.dto';

@ApiTags('Vendor Album')
@Controller('vendor-albums')
export class AlbumController {
  constructor(private readonly albumService: AlbumService) {}

  @Post(':locationId')
  @ApiOperation({ summary: 'Tạo vendor-album cho vendor' })
  @ApiParam({ name: 'locationId', type: 'string' })
  @ApiCreatedResponse({ description: 'Tạo vendor-album thành công' })
  @ApiBadRequestResponse({ description: 'Lỗi tạo vendor-album' })
  async createVendorAlbum(@Param('locationId') locationId: string) {
    return this.albumService.createVendorAlbum(locationId);
  }

  @Get(':locationId')
  @ApiOperation({ summary: 'Lấy tất cả vendor-album của vendor' })
  @ApiParam({ name: 'locationId', type: 'string' })
  @ApiOkResponse({ description: 'Danh sách vendor-album' })
  async getVendorAlbums(@Param('locationId') locationId: string, @Query() query: AlbumPaginationDto) {
    return this.albumService.getVendorAlbums(locationId, query);
  }

  @Post('album')
  @ApiOperation({ summary: 'Tạo album cho vendor-album' })
  @ApiBody({ type: CreateAlbumDto })
  @ApiCreatedResponse({ description: 'Tạo album thành công' })
  @ApiBadRequestResponse({ description: 'Chỉ được lưu tối đa 3 ảnh hoặc vendorAlbumId không tồn tại' })
  async createAlbum(@Body() body: CreateAlbumDto) {
    if (body.photos && body.photos.length > 3) {
      throw new BadRequestException('Chỉ được lưu tối đa 3 ảnh');
    }
    return this.albumService.createAlbum(body);
  }

  @Get('album/list/:vendorAlbumId')
  @ApiOperation({ summary: 'Lấy danh sách album theo vendor-album-id' })
  @ApiParam({ name: 'vendorAlbumId', type: 'string' })
  @ApiOkResponse({ description: 'Danh sách album' })
  async getAlbumsByVendorAlbum(@Param('vendorAlbumId') vendorAlbumId: string, @Query() query: AlbumPaginationDto) {
    return this.albumService.getAlbumsByVendorAlbum(vendorAlbumId, query);
  }

  @Get('album/user/:userId')
  @ApiOperation({ summary: 'Lấy danh sách album theo userId' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiOkResponse({ description: 'Danh sách album theo userId' })
  async getAlbumsByUserId(@Param('userId') userId: string, @Query() query: AlbumPaginationDto) {
    return this.albumService.getAlbumsByUserId(userId, query);
  }

  @Get('album/:albumId')
  @ApiOperation({ summary: 'Lấy 1 album theo id' })
  @ApiParam({ name: 'albumId', type: 'string' })
  @ApiOkResponse({ description: 'Thông tin album' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy album' })
  async getAlbum(@Param('albumId') albumId: string) {
    return this.albumService.getAlbum(albumId);
  }

  @Put('album/:albumId')
  @ApiOperation({ summary: 'Cập nhật album' })
  @ApiParam({ name: 'albumId', type: 'string' })
  @ApiBody({ type: UpdateAlbumDto })
  @ApiOkResponse({ description: 'Cập nhật album thành công' })
  @ApiBadRequestResponse({ description: 'Chỉ được lưu tối đa 3 ảnh hoặc vendorAlbumId không tồn tại' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy album' })
  async updateAlbum(@Param('albumId') albumId: string, @Body() body: UpdateAlbumDto) {
    if (body.photos && body.photos.length > 3) {
      throw new BadRequestException('Chỉ được lưu tối đa 3 ảnh');
    }
    return this.albumService.updateAlbum(albumId, body);
  }

  @Delete('album/:albumId')
  @ApiOperation({ summary: 'Xóa album' })
  @ApiParam({ name: 'albumId', type: 'string' })
  @ApiOkResponse({ description: 'Đã xóa album thành công' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy album' })
  async deleteAlbum(@Param('albumId') albumId: string) {
    return this.albumService.deleteAlbum(albumId);
  }
} 