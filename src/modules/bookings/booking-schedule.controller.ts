import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookingScheduleService } from './booking-schedule.service';
import { CreateBookingScheduleDto, UpdateBookingScheduleDto, PostponeBookingScheduleDto, ContinueBookingScheduleDto, BookingScheduleResponseDto } from './dto/booking-schedule.dto';
import { Public } from 'src/decorator/custom';

@ApiTags('Booking Schedule')
@Controller('booking-schedules')
@ApiBearerAuth('access-token')
export class BookingScheduleController {
  constructor(private readonly bookingScheduleService: BookingScheduleService) {}

  @Post(':bookingId')
  @ApiOperation({ summary: 'Tạo lịch booking mới' })
  @ApiResponse({ status: 201, description: 'Tạo lịch booking thành công', type: BookingScheduleResponseDto })
  async create(
    @Param('bookingId') bookingId: string,
    @Body() createDto: CreateBookingScheduleDto
  ) {
    return await this.bookingScheduleService.create(bookingId, createDto);
  }

  @Post(':bookingId/multiple')
  @ApiOperation({ summary: 'Tạo nhiều lịch booking cùng lúc' })
  @ApiResponse({ status: 201, description: 'Tạo nhiều lịch booking thành công', type: [BookingScheduleResponseDto] })
  async createMultiple(
    @Param('bookingId') bookingId: string,
    @Body() schedules: CreateBookingScheduleDto[]
  ) {
    return await this.bookingScheduleService.createMultiple(bookingId, schedules);
  }

  @Get('booking/:bookingId')
  @Public() 
  @ApiOperation({ summary: 'Lấy tất cả lịch booking theo booking ID' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách lịch booking thành công', type: [BookingScheduleResponseDto] })
  async findAllByBooking(@Param('bookingId') bookingId: string) {
    return await this.bookingScheduleService.findAllByBooking(bookingId);
  }

  @Get('booking/:bookingId/summary')
  @Public() 
  @ApiOperation({ summary: 'Lấy tổng quan lịch booking' })
  @ApiResponse({ status: 200, description: 'Lấy tổng quan lịch booking thành công' })
  async getBookingScheduleSummary(@Param('bookingId') bookingId: string) {
    return await this.bookingScheduleService.getBookingScheduleSummary(bookingId);
  }

  @Get(':id')
  @Public() 
  @ApiOperation({ summary: 'Lấy thông tin lịch booking theo ID' })
  @ApiResponse({ status: 200, description: 'Lấy thông tin lịch booking thành công', type: BookingScheduleResponseDto })
  async findOne(@Param('id') id: string) {
    return await this.bookingScheduleService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật lịch booking' })
  @ApiResponse({ status: 200, description: 'Cập nhật lịch booking thành công', type: BookingScheduleResponseDto })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBookingScheduleDto
  ) {
    return await this.bookingScheduleService.update(id, updateDto);
  }

  @Put(':id/postpone')
  @ApiOperation({ summary: 'Hoãn lịch booking' })
  @ApiResponse({ status: 200, description: 'Hoãn lịch booking thành công', type: BookingScheduleResponseDto })
  async postpone(
    @Param('id') id: string,
    @Body() postponeDto: PostponeBookingScheduleDto
  ) {
    return await this.bookingScheduleService.postpone(id, postponeDto);
  }

  @Put(':id/continue')
  @ApiOperation({ summary: 'Tiếp tục lịch booking đã hoãn' })
  @ApiResponse({ status: 200, description: 'Tiếp tục lịch booking thành công', type: BookingScheduleResponseDto })
  async continue(
    @Param('id') id: string,
    @Body() continueDto: ContinueBookingScheduleDto
  ) {
    return await this.bookingScheduleService.continue(id, continueDto);
  }

  @Put(':id/complete')
  @ApiOperation({ summary: 'Hoàn thành lịch booking' })
  @ApiResponse({ status: 200, description: 'Hoàn thành lịch booking thành công', type: BookingScheduleResponseDto })
  async complete(@Param('id') id: string) {
    return await this.bookingScheduleService.complete(id);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Hủy lịch booking' })
  @ApiResponse({ status: 200, description: 'Hủy lịch booking thành công', type: BookingScheduleResponseDto })
  async cancel(
    @Param('id') id: string,
    @Body() body: { reason?: string }
  ) {
    return await this.bookingScheduleService.cancel(id, body.reason);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa lịch booking' })
  @ApiResponse({ status: 200, description: 'Xóa lịch booking thành công' })
  async delete(@Param('id') id: string) {
    return await this.bookingScheduleService.delete(id);
  }
} 