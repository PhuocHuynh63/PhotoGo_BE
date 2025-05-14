import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking } from './entities/booking.entity';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiExtraModels } from '@nestjs/swagger/dist/decorators/api-extra-models.decorator';
import { BookingDepositType, BookingSourceType, BookingStatus } from 'src/constants/booking.enum';
import e from 'express';

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
  create(@Body() createBookingDto: CreateBookingDto,
         @Query('userId') userId: string,
         @Query('servicePackageId') servicePackageId: string): Promise<Booking> {
    return this.bookingService.create(createBookingDto, userId, servicePackageId);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'Danh sách tất cả booking', type: [Booking] })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  @ApiOperation({ summary: 'Lấy tất cả booking' })
  findAll(): Promise<Booking[]> {
    return this.bookingService.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Tìm thấy booking', type: Booking })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  @ApiOperation({ summary: 'Lấy booking theo ID' })
  findOne(@Param('id') id: string): Promise<Booking> {
    return this.bookingService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto): Promise<Booking> {
    return this.bookingService.update(id, updateBookingDto);
  }
  
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.bookingService.remove(id);
  }
}