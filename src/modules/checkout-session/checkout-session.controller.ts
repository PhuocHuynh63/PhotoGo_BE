import { Controller, Post, Get, Body, Headers, Request, Delete, Patch, Param } from '@nestjs/common';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiParam } from '@nestjs/swagger';
import { CheckoutSessionService } from './checkout-session.service';

@ApiTags('Checkout Session')
@Controller('checkout-session')
export class CheckoutSessionController {
  constructor(
    private readonly checkoutSessionService: CheckoutSessionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Lưu thông tin phiên đặt chỗ' })
  @ApiResponse({ status: 201, description: 'Phiên đặt chỗ đã được lưu thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc phiên đã tồn tại' })
  @ApiHeader({ name: 'x-device-id', required: false, description: 'Device ID for non-authenticated users' })
  async createSession(
    @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
    @Request() req: any,
    @Headers('x-device-id') deviceId?: string,
  ) {
    const userId = req.user?.id;
    return this.checkoutSessionService.createSession(
      createCheckoutSessionDto,
      userId,
      deviceId
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lấy thông tin phiên đặt chỗ' })
  @ApiResponse({ status: 200, description: 'Thông tin phiên đặt chỗ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phiên đặt chỗ' })
  @ApiHeader({ name: 'x-device-id', required: false, description: 'Device ID for non-authenticated users' })
  async getSession(
    @Request() req: any,
    @Headers('x-device-id') deviceId?: string,
  ) {
    const userId = req.user?.id;
    return this.checkoutSessionService.getSession(userId, deviceId);
  }

  @Get('ttl')
  @ApiOperation({ summary: 'Lấy thời gian còn lại của phiên đặt chỗ' })
  @ApiResponse({ status: 200, description: 'Thời gian còn lại (giây)' })
  @ApiHeader({ name: 'x-device-id', required: false, description: 'Device ID for non-authenticated users' })
  async getSessionTTL(
    @Request() req: any,
    @Headers('x-device-id') deviceId?: string,
  ) {
    const userId = req.user?.id;
    const ttl = await this.checkoutSessionService.getSessionTTL(userId, deviceId);
    return { ttl };
  }

  @Patch()
  @ApiOperation({ summary: 'Cập nhật thông tin phiên đặt chỗ' })
  @ApiResponse({ status: 200, description: 'Thông tin phiên đặt chỗ đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phiên đặt chỗ' })
  @ApiHeader({ name: 'x-device-id', required: false, description: 'Device ID for non-authenticated users' })
  async updateSession(
    @Body() updateData: Partial<CreateCheckoutSessionDto>,
    @Request() req: any,
    @Headers('x-device-id') deviceId?: string,
  ) {
    const userId = req.user?.id;
    return this.checkoutSessionService.updateSessionData(
      updateData,
      userId,
      deviceId
    );
  }

  @Delete()
  @ApiOperation({ summary: 'Xóa phiên đặt chỗ' })
  @ApiResponse({ status: 200, description: 'Phiên đặt chỗ đã được xóa thành công' })
  @ApiHeader({ name: 'x-device-id', required: false, description: 'Device ID for non-authenticated users' })
  async deleteSession(
    @Request() req: any,
    @Headers('x-device-id') deviceId?: string,
  ) {
    const userId = req.user?.id;
    await this.checkoutSessionService.deleteSession(userId, deviceId);
    return { message: 'Phiên đặt chỗ đã được xóa thành công' };
  }
} 