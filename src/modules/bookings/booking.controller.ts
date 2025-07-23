import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpException,
  HttpStatus,
  UseGuards,
  Put,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingScheduleService } from './booking-schedule.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto, UpdateStatusDto } from './dto/update-booking.dto';
import { VendorCancelBookingDto } from './dto/vendor-cancel-booking.dto';
import { CheckMultiDayAvailabilityDto, CheckMultiDayAvailabilityResponseDto } from './dto/check-multi-day-availability.dto';
import { Booking } from './entities/booking.entity';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiExtraModels } from '@nestjs/swagger/dist/decorators/api-extra-models.decorator';
import { Public } from 'src/decorator/custom';
import { PaginationDto } from './dto/pagination.dto';
import { GetDiscountAmountDto } from './dto/get-booking.dto';
import { ResponseMessage } from '../../decorator/custom';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';
import { RolesGuard } from '../auth/passport/roles.guard';
import { Roles } from 'src/decorator/role.decorator';
import { Role } from 'src/modules/roles/entities/role.entity';
import { CodeVerificationDto } from './dto/code-verification.dto';

@Controller('bookings')
@ApiExtraModels(CreateBookingDto)
@ApiTags('Booking')
@ApiBearerAuth('access-token')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly bookingScheduleService: BookingScheduleService,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Tạo mới booking' })
  @ApiBody({ type: CreateBookingDto })
  @ApiResponse({
    status: 201,
    description: 'Tạo booking thành công',
    type: Booking,
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @Query('userId') userId: string,
    @Query('serviceConceptId') serviceConceptId: string,
  ): Promise<{ booking: Booking; paymentLink: string; code: string }> {
    try {
      if (!userId) {
        throw new HttpException('User ID là bắt buộc', HttpStatus.BAD_REQUEST);
      }
      if (!serviceConceptId) {
        throw new HttpException(
          'Service Concept ID là bắt buộc',
          HttpStatus.BAD_REQUEST,
        );
      }
      const result = await this.bookingService.create(
        createBookingDto,
        userId,
        serviceConceptId,
      );
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Có lỗi xảy ra khi tạo booking',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @Public()
  @ApiResponse({
    status: 200,
    description: 'Danh sách tất cả booking',
    type: [Booking],
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  @ApiOperation({ summary: 'Lấy tất cả booking' })
  async findAll(@Query() paginationDto: PaginationDto): Promise<{
    data: Booking[];
    pagination: {
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
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('priorityScore')
  @Public()
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách booking được sắp xếp theo độ ưu tiên',
    type: [Booking],
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  @ApiOperation({ summary: 'Lấy danh sách booking được sắp xếp theo độ ưu tiên' })
  async getPriorityScore(@Query() paginationDto: PaginationDto): Promise<{
    data: Booking[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    try {
      return await this.bookingService.getPriorityScore(paginationDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Có lỗi xảy ra khi lấy danh sách booking được sắp xếp theo độ ưu tiên',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('code-verification')
  // @Public()
  @ApiOperation({ summary: 'Xác nhận check-in bằng code' })
  @ApiResponse({ status: 200, description: 'Check-in thành công', type: String })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking hoặc code không hợp lệ' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  async verifyCode(@Body() dto: CodeVerificationDto): Promise<{ message: string, code: string }> {
    return await this.bookingService.getCodeVerification(dto.code, dto.userId, dto.vendorId);
  }

  @Get('check-in-status')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách booking theo trạng thái check-in' })
  @ApiResponse({ status: 200, description: 'Danh sách booking theo trạng thái check-in', type: [Booking] })
  async getBookingsByCheckInStatus(
    @Query('isCheckedIn') isCheckedIn: string,
    @Query() paginationDto: PaginationDto
  ): Promise<{  
    data: Booking[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    try {
      // Mặc định nếu không truyền thì lấy tất cả
      let checkedIn: boolean | undefined = undefined;
      if (isCheckedIn === 'true') checkedIn = true;
      else if (isCheckedIn === 'false') checkedIn = false;
      return await this.bookingService.findBookingsByCheckInStatus(checkedIn, paginationDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Có lỗi xảy ra khi lấy danh sách booking theo trạng thái check-in',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userId')
  @Public()
  @ApiResponse({
    status: 200,
    description: 'Danh sách booking của user',
    type: [Booking],
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  @ApiOperation({ summary: 'Lấy danh sách booking của user' })
  async findAllByUserId(
    @Param('userId') userId: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<{
    data: Booking[];
    pagination: {
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
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('vendor/:vendorId/priority')
  @Public()
  @ApiResponse({
    status: 200,
    description: 'Danh sách booking được sắp xếp theo độ ưu tiên',
    type: [Booking],
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  @ApiOperation({ summary: 'Lấy danh sách booking được sắp xếp theo độ ưu tiên cho vendor' })
  async getBookingsByPriorityScore(
    @Param('vendorId') vendorId: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<{
    data: Booking[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    try {
      if (!vendorId) {
        throw new HttpException('Vendor ID là bắt buộc', HttpStatus.BAD_REQUEST);
      }
      return await this.bookingService.getBookingsByPriorityScore(vendorId, paginationDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Có lỗi xảy ra khi lấy danh sách booking theo độ ưu tiên',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('get-discount-amount')
  @Public()
  @ApiResponse({ status: 200, description: 'Lấy số tiền giảm giá', type: GetDiscountAmountDto })
  @ApiResponse({ status: 404, description: 'Không tìm thấy số tiền giảm giá' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  @ApiOperation({ summary: 'Lấy số tiền giảm giá' })
  async getDiscountAmount(@Query() getDiscountAmountDto: GetDiscountAmountDto): Promise<{discount: number, depositAmount: number, remainingAmount: number}> {
    try {
      return await this.bookingService.getDiscountAmount(getDiscountAmountDto.userId, getDiscountAmountDto.serviceConceptId, getDiscountAmountDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Có lỗi xảy ra khi lấy số tiền giảm giá',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('get-booking-by-code')
  @Public()
  @ApiResponse({ status: 200, description: 'Lấy booking theo code', type: Booking })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  @ApiOperation({ summary: 'Lấy booking theo code' })
  async getBookingByCode(@Query('code') code: string): Promise<Booking> {
    try {
      return await this.bookingService.getBookingByCode(code);
    } catch (error) {
      throw new HttpException(
        error.message || 'Có lỗi xảy ra khi lấy booking theo code',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Lấy thông tin booking theo ID' })
  @ApiResponse({ status: 200, description: 'Lấy thông tin booking thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ResponseMessage('Lấy thông tin booking thành công')
  async findOne(@Param('id') id: string): Promise<Booking> {
    return this.bookingService.findOne(id);
  }

  @Get(':id/with-schedules')
  @Public()
  @ApiOperation({ summary: 'Lấy thông tin booking với lịch trình' })
  @ApiResponse({ status: 200, description: 'Lấy thông tin booking với lịch trình thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ResponseMessage('Lấy thông tin booking với lịch trình thành công')
  async findOneWithSchedules(@Param('id') id: string): Promise<{ booking: Booking; schedules: any[] }> {
    const booking = await this.bookingService.findOne(id);
    const schedules = await this.bookingScheduleService.findAllByBooking(id);
    return { booking, schedules };
  }

  // @Get(':id/check-availability')
  // @ApiOperation({ summary: 'Kiểm tra slot thời gian còn khả dụng không trước khi thanh toán' })
  // @ApiResponse({ status: 200, description: 'Kiểm tra thành công' })
  // @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  // @ResponseMessage('Kiểm tra slot thành công')
  // async checkSlotAvailability(@Param('id') id: string): Promise<{ available: boolean; message: string }> {
  //   const isAvailable = await this.bookingService['isSlotStillAvailable'](id);
  //   return {
  //     available: isAvailable,
  //     message: isAvailable 
  //       ? 'Slot thời gian vẫn còn khả dụng' 
  //       : 'Slot thời gian đã được đặt bởi người khác'
  //   };
  // }

  @Post('admin/handle-timeout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles({ id: 'R005' } as Role)
  @ApiOperation({ summary: 'Xử lý timeout cho các booking chưa thanh toán (Admin only)' })
  @ApiResponse({ status: 200, description: 'Xử lý timeout thành công' })
  @ResponseMessage('Xử lý timeout thành công')
  async handleBookingTimeout(): Promise<{ message: string; cancelledCount: number }> {
    return this.bookingService.handleBookingTimeout();
  }

  @Get('check-slot-availability')
  @Public()
  @ApiResponse({ status: 200, description: 'Kiểm tra slot availability', type: Object })
  @ApiResponse({ status: 404, description: 'Không tìm thấy slot' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  @ApiOperation({ summary: 'Kiểm tra slot availability cho single day booking' })
  async checkSlotAvailability(
    @Query('date') date: string,
    @Query('time') time: string,
    @Query('locationId') locationId: string,
  ) {
    try {
      if (!date || !time || !locationId) {
        throw new HttpException(
          'Date, time và locationId là bắt buộc',
          HttpStatus.BAD_REQUEST,
        );
      }
      return await this.bookingService.checkSlotAvailabilityWithDetails(
        date,
        time,
        locationId,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Có lỗi xảy ra khi kiểm tra slot availability',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('check-multi-day-availability')
  @Public()
  @ApiBody({ type: CheckMultiDayAvailabilityDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Kiểm tra multi-day availability thành công', 
    type: CheckMultiDayAvailabilityResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  @ApiOperation({ summary: 'Kiểm tra multi-day availability trước khi tạo booking' })
  async checkMultiDayAvailability(
    @Body() checkMultiDayAvailabilityDto: CheckMultiDayAvailabilityDto,
  ): Promise<CheckMultiDayAvailabilityResponseDto> {
    try {
      // Get service concept to pass duration
      const serviceConcept = await this.bookingService['serviceConceptRepository'].findOne({
        where: { id: checkMultiDayAvailabilityDto.serviceConceptId }
      });

      return await this.bookingService.checkMultiDayAvailability(
        checkMultiDayAvailabilityDto.schedules,
        checkMultiDayAvailabilityDto.locationId,
        serviceConcept
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Có lỗi xảy ra khi kiểm tra multi-day availability',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật booking' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật booking thành công',
    type: Booking,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  async update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ): Promise<Booking> {
    try {
      if (!id) {
        throw new HttpException(
          'Booking ID là bắt buộc',
          HttpStatus.BAD_REQUEST,
        );
      }
      return await this.bookingService.update(id, updateBookingDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Có lỗi xảy ra khi cập nhật booking',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
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
        throw new HttpException(
          'Booking ID là bắt buộc',
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.bookingService.remove(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Có lỗi xảy ra khi xóa booking',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/payos-info')
  @Public()
  @ApiResponse({
    status: 200,
    description: 'Lấy PayOS info thành công',
    schema: { example: { paymentOSId: '...', payosLink: '...' } },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy booking hoặc PayOS info',
  })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  @ApiOperation({
    summary: 'Lấy PayOS info (paymentOSId và payosLink) theo bookingId',
  })
  async getPayOSInfoByBookingId(
    @Param('id') id: string,
  ): Promise<{ paymentOSId: string; payosLink: string }> {
    try {
      if (!id) {
        throw new HttpException(
          'Booking ID là bắt buộc',
          HttpStatus.BAD_REQUEST,
        );
      }
      return await this.bookingService.getPayOSInfoByBookingId(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Có lỗi xảy ra khi lấy PayOS info',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('paymentOSId/:paymentOSId')
  @Public()
  @ApiResponse({
    status: 200,
    description: 'Lấy booking theo paymentOSId thành công',
    type: Booking,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  @ApiOperation({ summary: 'Lấy booking theo paymentOSId' })
  async getBookingByPaymentOSId(
    @Param('paymentOSId') paymentOSId: string,
  ): Promise<Booking> {
    return await this.bookingService.getBookingByPaymentOSId(paymentOSId);
  }

  // api for update status booking
  @Patch(':id/update-status')
  @ApiOperation({ summary: 'Cập nhật trạng thái booking' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái booking thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  async updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateStatusDto): Promise<Booking> {
    return await this.bookingService.updateStatus(id, updateStatusDto);
  }

  @Post(':id/vendor-cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles({ id: 'R005' } as Role)
  @ApiOperation({ summary: 'Vendor hủy booking' })
  @ApiBody({ type: VendorCancelBookingDto })
  @ApiResponse({
    status: 200,
    description: 'Vendor hủy booking thành công',
    type: Booking,
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền hủy booking này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  @ApiResponse({ status: 500, description: 'Lỗi server' })
  async vendorCancelBooking(
    @Param('id') id: string,
    @Body() vendorCancelBookingDto: VendorCancelBookingDto,
  ): Promise<Booking> {
    try {
      if (!id) {
        throw new HttpException('Booking ID là bắt buộc', HttpStatus.BAD_REQUEST);
      }
      if (!vendorCancelBookingDto.vendorId) {
        throw new HttpException('Vendor ID là bắt buộc', HttpStatus.BAD_REQUEST);
      }
      return await this.bookingService.vendorCancelBooking(
        id,
        vendorCancelBookingDto.vendorId,
        vendorCancelBookingDto.reason,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Có lỗi xảy ra khi vendor hủy booking',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // @Get('valid-next-statuses/:currentStatus')
  // @Public()
  // @ApiOperation({ summary: 'Lấy danh sách trạng thái tiếp theo hợp lệ' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Danh sách trạng thái tiếp theo hợp lệ',
  //   schema: {
  //     example: {
  //       currentStatus: 'PAID',
  //       validNextStatuses: ['PENDING', 'CANCELLED_USER', 'CANCELLED_VENDOR'],
  //       nextInMainFlow: 'PENDING'
  //     }
  //   }
  // })
  // async getValidNextStatuses(@Param('currentStatus') currentStatus: string): Promise<{
  //   currentStatus: string;
  //   validNextStatuses: string[];
  //   nextInMainFlow: string | null;
  // }> {
  //   try {
  //     if (!currentStatus) {
  //       throw new HttpException('Current status là bắt buộc', HttpStatus.BAD_REQUEST);
  //     }

  //     // Validate that the status exists in BookingStatus enum
  //     const bookingStatuses = Object.values(require('src/constants/booking.enum').BookingStatus);
  //     if (!bookingStatuses.includes(currentStatus)) {
  //       throw new HttpException(`Trạng thái ${currentStatus} không hợp lệ`, HttpStatus.BAD_REQUEST);
  //     }

  //     const validNextStatuses = this.bookingService.getValidNextStatuses(currentStatus as any);
  //     const nextInMainFlow = this.bookingService.getNextValidStatus(currentStatus as any);

  //     return {
  //       currentStatus,
  //       validNextStatuses: validNextStatuses.map(status => status.toString()),
  //       nextInMainFlow: nextInMainFlow ? nextInMainFlow.toString() : null
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       error.message || 'Có lỗi xảy ra khi lấy danh sách trạng thái tiếp theo',
  //       error.status || HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }
}
