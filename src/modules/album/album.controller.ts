import { Body, Controller, Delete, Get, Param, Post, Put, BadRequestException, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FileFieldsInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AlbumService } from './album.service';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { CreateAlbumMultipartDto } from './dto/create-album-multipart.dto';
import { UpdateAlbumMultipartDto } from './dto/update-album-multipart.dto';
import { ApiTags, ApiBody, ApiResponse, ApiOperation, ApiParam, ApiOkResponse, ApiCreatedResponse, ApiBadRequestResponse, ApiNotFoundResponse, ApiQuery, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { AlbumPaginationDto } from './dto/pagination.dto';
import { Public } from './../../decorator/custom';
import { AlbumStatus } from 'src/constants/album.enum';
import { AlbumFilterDto } from './dto/filter.dto';

@ApiTags('Vendor Album')
@Controller('vendor-albums')
@ApiBearerAuth('access-token')
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
  @Public()
  @ApiOperation({ summary: 'Lấy tất cả vendor-album của vendor' })
  @ApiParam({ name: 'locationId', type: 'string' })
  @ApiOkResponse({ description: 'Danh sách vendor-album' })
  async getVendorAlbums(@Param('locationId') locationId: string, @Query() query: AlbumPaginationDto) {
    return this.albumService.getVendorAlbums(locationId, query);
  }

  @Post('album')
  @ApiOperation({ summary: 'Tạo album cho vendor-album (JSON)' })
  @ApiBody({ type: CreateAlbumDto })
  @ApiCreatedResponse({ description: 'Tạo album thành công' })
  @ApiBadRequestResponse({ description: 'Chỉ được lưu tối đa 3 ảnh hoặc vendorAlbumId không tồn tại' })
  async createAlbum(@Body() body: CreateAlbumDto) {
    if (body.photos && body.photos.length > 3) {
      throw new BadRequestException('Chỉ được lưu tối đa 3 ảnh');
    }
    return this.albumService.createAlbum(body);
  }

  @Post('album/upload')
  @ApiOperation({ summary: 'Tạo album với upload ảnh (Multipart Form)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        locationId: { type: 'string', description: 'Location ID' },
        bookingId: { type: 'string', description: 'Booking ID' },
        date: { type: 'string', description: 'Date' },
        driveLink: { type: 'string', format: 'url', description: 'Google Drive link (optional)' },
        photos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Photo files (max 3)',
        },
        behindTheScenes: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Behind the scene files (max 3)',
        },
        status: {
          type: 'string',
          description: 'Status',
          enum: Object.values(AlbumStatus),
          default: AlbumStatus.NOT_UPLOAD,
        },
      },
      required: ['bookingId', 'locationId'],
    },
  })
  @ApiCreatedResponse({ description: 'Tạo album thành công' })
  @ApiBadRequestResponse({ description: 'Lỗi upload ảnh hoặc locationId không tồn tại' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'photos', maxCount: 3 }, { name: 'behindTheScenes', maxCount: 3 }]))
  async createAlbumWithUpload(
    @Body() body: CreateAlbumMultipartDto,
    @UploadedFiles() files: { photos?: Express.Multer.File[]; behindTheScenes?: Express.Multer.File[] },
  ) {
    return this.albumService.createAlbumWithUpload(
      body, 
      files?.photos || [], 
      files?.behindTheScenes || []
    );
  }

  @Get('album/list/:vendorAlbumId')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách album theo vendor-album-id' })
  @ApiParam({ name: 'vendorAlbumId', type: 'string' })
  @ApiOkResponse({ description: 'Danh sách album' })
  async getAlbumsByVendorAlbum(@Param('vendorAlbumId') vendorAlbumId: string, @Query() query: AlbumPaginationDto) {
    return this.albumService.getAlbumsByVendorAlbum(vendorAlbumId, query);
  }

  // //get album theo date
  // @Get('album/date/:date')
  // @Public()
  // @ApiOperation({ summary: 'Lấy danh sách album theo date' })
  // @ApiParam({ name: 'date', type: 'string' })
  // @ApiOkResponse({ description: 'Danh sách album' })
  // async getAlbumsByDate(@Param('date') date: string, @Query() query: AlbumPaginationDto) {
  //   return this.albumService.getAlbumsByDate(date, query);
  // }

  @Get('album/location/:locationId')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách album theo locationId' })
  @ApiParam({ name: 'locationId', type: 'string' })
  @ApiOkResponse({ description: 'Danh sách album' })
  async getAlbumsByLocation(@Param('locationId') locationId: string, @Query('date') date: string, @Query() query: AlbumFilterDto) {
    return this.albumService.getAlbumsByLocation(locationId, date, query);
  }

  @Get('album/user/:userId')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách album theo userId' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiOkResponse({ description: 'Danh sách album theo userId' })
  async getAlbumsByUserId(@Param('userId') userId: string, @Query() query: AlbumPaginationDto) {
    return this.albumService.getAlbumsByUserId(userId, query);
  }

  @Get('album/:albumId')
  @Public()
  @ApiOperation({ summary: 'Lấy 1 album theo id' })
  @ApiParam({ name: 'albumId', type: 'string' })
  @ApiOkResponse({ description: 'Thông tin album' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy album' })
  async getAlbum(@Param('albumId') albumId: string) {
    return this.albumService.getAlbum(albumId);
  }

  @Put('album/:albumId')
  @ApiOperation({ summary: 'Cập nhật album (JSON)' })
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

  @Put('album/:albumId/upload')
  @ApiOperation({ summary: 'Cập nhật album với upload ảnh (Multipart Form)' })
  @ApiParam({ name: 'albumId', type: 'string' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        bookingId: { type: 'string', description: 'Booking ID (optional)' },
        date: { type: 'string', description: 'Date (optional)' },
        locationId: { type: 'string', description: 'Location ID (optional)' },
        driveLink: { type: 'string', format: 'url', description: 'Google Drive link (optional)' },
        photos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Photo files (max 3)',
        },
        behindTheScenes: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Behind the scene files (max 3)',
        },
        status: {
          type: 'string',
          description: 'Status',
          enum: Object.values(AlbumStatus),
          default: AlbumStatus.NOT_UPLOAD,
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Cập nhật album thành công' })
  @ApiBadRequestResponse({ description: 'Lỗi upload ảnh hoặc locationId không tồn tại' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy album' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'photos', maxCount: 3 }, { name: 'behindTheScenes', maxCount: 3 }]))
  async updateAlbumWithUpload(
    @Param('albumId') albumId: string,
    @Body() body: UpdateAlbumMultipartDto,
    @UploadedFiles() files: { photos?: Express.Multer.File[]; behindTheScenes?: Express.Multer.File[] },
  ) {
    return this.albumService.updateAlbumWithUpload(
      albumId, 
      body, 
      files?.photos || [], 
      files?.behindTheScenes || []
    );
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