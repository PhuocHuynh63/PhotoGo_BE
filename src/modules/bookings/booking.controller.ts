import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpException, HttpStatus } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking } from './entities/booking.entity';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiExtraModels } from '@nestjs/swagger/dist/decorators/api-extra-models.decorator';
import { BookingDepositType, BookingSourceType, BookingStatus } from 'src/constants/booking.enum';
import { Public } from 'src/decorator/custom';
import { PaginationDto } from './dto/pagination.dto';

@Controller('bookings')
@ApiExtraModels(CreateBookingDto)
@ApiTags('Booking')
@ApiBearerAuth('access-token')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo mới booking' })
  @ApiBody({ type: CreateBookingDto })
  @ApiResponse({ status: 201, description: 'Tạo booking thành công', type: Booking })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @Query('userId') userId: string,
    @Query('serviceConceptId') serviceConceptId: string
  ): Promise<{ booking: Booking; paymentLink: string }> {
    try {
      if (!userId) {
        throw new HttpException('User ID là bắt buộc', HttpStatus.BAD_REQUEST);
      }
      if (!serviceConceptId) {
        throw new HttpException('Service Concept ID là bắt buộc', HttpStatus.BAD_REQUEST);
      }
      const result = await this.bookingService.create(createBookingDto, userId, serviceConceptId);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Có lỗi xảy ra khi tạo booking',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  @Public()
  @ApiResponse({ status: 200, description: 'Danh sách tất cả booking', type: [Booking] })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  @ApiOperation({ summary: 'Lấy tất cả booking' })
  async findAll(@Query() paginationDto: PaginationDto): Promise<{
    data: Booking[];
    meta: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    try {
      return await this.bookingService.findAll(paginationDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Có lỗi xảy ra khi lấy danh sách booking',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('user/:userId')
  @Public()
  @ApiResponse({ status: 200, description: 'Danh sách booking của user', type: [Booking] })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  @ApiOperation({ summary: 'Lấy danh sách booking của user' })
  async findAllByUserId(@Param('userId') userId: string, @Query() paginationDto: PaginationDto): Promise<{
    data: Booking[];
    meta: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    try {
      if (!userId) {
        throw new HttpException('User ID là bắt buộc', HttpStatus.BAD_REQUEST);
      }
      return await this.bookingService.findAllByUserId(userId, paginationDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Có lỗi xảy ra khi lấy danh sách booking của user',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  @Public()
  @ApiResponse({ status: 200, description: 'Tìm thấy booking', type: Booking })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  @ApiOperation({ summary: 'Lấy booking theo ID' })
  async findOne(@Param('id') id: string): Promise<Booking> {
    try {
      if (!id) {
        throw new HttpException('Booking ID là bắt buộc', HttpStatus.BAD_REQUEST);
      }
      return await this.bookingService.findOne(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Có lỗi xảy ra khi tìm booking',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật booking' })
  @ApiResponse({ status: 200, description: 'Cập nhật booking thành công', type: Booking })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  async update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto
  ): Promise<Booking> {
    try {
      if (!id) {
        throw new HttpException('Booking ID là bắt buộc', HttpStatus.BAD_REQUEST);
      }
      return await this.bookingService.update(id, updateBookingDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Có lỗi xảy ra khi cập nhật booking',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Delete(':id')
  @ApiOperation({ summary: 'Xóa booking' })
  @ApiResponse({ status: 200, description: 'Xóa booking thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  async remove(@Param('id') id: string): Promise<void> {
    try {
      if (!id) {
        throw new HttpException('Booking ID là bắt buộc', HttpStatus.BAD_REQUEST);
      }
      await this.bookingService.remove(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Có lỗi xảy ra khi xóa booking',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}