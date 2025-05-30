import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { CheckoutSessionService } from './checkout-session.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';
import { Public } from 'src/decorator/custom';

@ApiTags('checkout-session')
@Controller('checkout-session')
@ApiHeader({
  name: 'device-id',
  description: 'ID của thiết bị (bắt buộc nếu không có userId)',
  required: false
})
@ApiBearerAuth('access-token')
export class CheckoutSessionController {
  constructor(private readonly checkoutSessionService: CheckoutSessionService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Tạo phiên đặt chỗ mới' })
  @ApiResponse({ status: 201, description: 'Phiên đặt chỗ đã được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Không có ID người dùng hoặc ID thiết bị' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionData: {
          type: 'string',
          description: 'Dữ liệu phiên đặt chỗ',
          example: '{"vendorId": "123", "servicePackageId": "456", "selectedTime": "2024-03-20T14:00:00Z"}'
        }
      }
    }
  })
  async createSession(
    @Body('sessionData') sessionData: string,
    @Query('userId') userId: string,
    @Query('deviceId') deviceId: string,
  ) {
    return this.checkoutSessionService.createSession(
      sessionData,
      userId,
      deviceId,
    );
  }

  @Get()
  @Public()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy thông tin phiên đặt chỗ' })
  @ApiResponse({ status: 200, description: 'Lấy thông tin phiên đặt chỗ thành công' })
  async getSession(@Req() req: any) {
    return this.checkoutSessionService.getSession(
      req.user?.id,
      req.headers['device-id'],
    );
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Xóa phiên đặt chỗ' })
  @ApiResponse({ status: 200, description: 'Xóa phiên đặt chỗ thành công' })
  async deleteSession(@Req() req: any) {
    return this.checkoutSessionService.deleteSession(
      req.user?.id,
      req.headers['device-id'],
    );
  }

  @Post('update')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cập nhật thông tin phiên đặt chỗ' })
  @ApiResponse({ status: 200, description: 'Cập nhật thông tin phiên đặt chỗ thành công' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionData: {
          type: 'string',
          description: 'Dữ liệu phiên đặt chỗ mới',
          example: '{"vendorId": "123", "servicePackageId": "456", "selectedTime": "2024-03-20T14:00:00Z"}'
        }
      }
    }
  })
  async updateSessionData(
    @Body('sessionData') sessionData: string,
    @Req() req: any,
  ) {
    return this.checkoutSessionService.updateSessionData(
      sessionData,
      req.user?.id,
      req.headers['device-id'],
    );
  }

  @Get('ttl')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy thời gian sống còn lại của phiên đặt chỗ' })
  @ApiResponse({ status: 200, description: 'Lấy thời gian sống thành công' })
  async getSessionTTL(@Req() req: any) {
    return this.checkoutSessionService.getSessionTTL(
      req.user?.id,
      req.headers['device-id'],
    );
  }
} 