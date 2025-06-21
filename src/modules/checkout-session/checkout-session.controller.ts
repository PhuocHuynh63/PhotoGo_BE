import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { CheckoutSessionService } from './checkout-session.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';
import { Public, ResponseMessage } from 'src/decorator/custom';
import {
  CheckoutSessionDto,
  CreateCheckoutSessionDto,
  UpdateCheckoutSessionDto,
} from './dto/checkout-sesion';

@ApiTags('checkout-session')
@Controller('checkout-session')
@ApiBearerAuth('access-token')
export class CheckoutSessionController {
  constructor(private readonly checkoutSessionService: CheckoutSessionService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Phiên đặt chỗ đã được tạo thành công')
  @ApiOperation({ summary: 'Tạo phiên đặt chỗ mới' })
  @ApiResponse({
    status: 201,
    description: 'Phiên đặt chỗ đã được tạo thành công',
    type: CheckoutSessionDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Không có ID người dùng hoặc ID thiết bị',
  })
  @ApiBody({
    type: CreateCheckoutSessionDto,
  })
  async createSession(
    @Query('id') id: string,
    @Query('userId') userId: string,
    @Body() sessionData: CreateCheckoutSessionDto,
  ) {
    return this.checkoutSessionService.createSession(id, userId, sessionData);
  }

  @Get()
  @Public()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Lấy thông tin phiên đặt chỗ thành công')
  @ApiOperation({ summary: 'Lấy thông tin phiên đặt chỗ' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin phiên đặt chỗ thành công',
    type: CheckoutSessionDto,
  })
  async getSession(
    @Query('id') id: string,
    @Query('userId') userId: string,
  ) {
    return this.checkoutSessionService.getSession(userId, id);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Xóa phiên đặt chỗ thành công')
  @ApiOperation({ summary: 'Xóa phiên đặt chỗ' })
  @ApiResponse({ status: 200, description: 'Xóa phiên đặt chỗ thành công' })
  async deleteSession(
    @Query('id') id: string,
    @Query('userId') userId: string,
  ) {
    return this.checkoutSessionService.deleteSession(userId, id);
  }

  @Post('update')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Cập nhật thông tin phiên đặt chỗ thành công')
  @ApiOperation({ summary: 'Cập nhật thông tin phiên đặt chỗ' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thông tin phiên đặt chỗ thành công',
    type: CheckoutSessionDto,
  })
  @ApiBody({
    type: UpdateCheckoutSessionDto,
  })
  async updateSessionData(
    @Body() sessionData: UpdateCheckoutSessionDto,
    @Query('id') id: string,
    @Query('userId') userId: string,
  ) {
    return this.checkoutSessionService.updateSessionData(
      sessionData,
      userId,
      id,
    );
  }

  @Get('ttl')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Lấy thời gian sống thành công')
  @ApiOperation({
    summary: 'Lấy thời gian sống còn lại của phiên đặt chỗ',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thời gian sống thành công',
  })
  async getSessionTTL(
    @Query('id') id: string,
    @Query('userId') userId: string,
  ) {
    return this.checkoutSessionService.getSessionTTL(userId, id);
  }
} 