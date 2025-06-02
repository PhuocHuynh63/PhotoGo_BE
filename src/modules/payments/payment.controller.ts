import { Controller, Post, Get, Param, Query, Body, Put, Delete, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FindAllPaymentsDto } from './dto/find-all-payments.dto';
import { Payment } from './entities/payment.entity';
import { PayOSWebhookDto } from './dto/payos-webhook.dto';
import { PaymentType } from '../../constants/payment.enum';
import { JwtAuthGuard } from 'src/modules/auth/passport/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/passport/roles.guard';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo mới một thanh toán' })
  @ApiResponse({ status: 201, description: 'Thanh toán được tạo thành công', type: Payment })
  async create(@Body() createPaymentDto: CreatePaymentDto): Promise<Payment> {
    return await this.paymentService.create(createPaymentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả thanh toán' })
  @ApiResponse({ status: 200, description: 'Danh sách thanh toán', type: [Payment] })
  async findAll(@Query() query: FindAllPaymentsDto): Promise<Payment[]> {
    return await this.paymentService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin thanh toán theo ID' })
  @ApiResponse({ status: 200, description: 'Thông tin thanh toán', type: Payment })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thanh toán' })
  async findOne(@Param('id') id: string): Promise<Payment> {
    return await this.paymentService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin thanh toán' })
  @ApiResponse({ status: 200, description: 'Thanh toán được cập nhật thành công', type: Payment })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thanh toán' })
  async update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    return await this.paymentService.update(id, updatePaymentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa thanh toán' })
  @ApiResponse({ status: 200, description: 'Thanh toán được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thanh toán' })
  async remove(@Param('id') id: string): Promise<void> {
    return await this.paymentService.remove(id);
  }

  @Post('/:invoiceId/payos/link')
  @ApiOperation({ summary: 'Tạo liên kết thanh toán PayOS' })
  @ApiResponse({ status: 201, description: 'Liên kết thanh toán được tạo thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hóa đơn' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  async createPayOSLink(
    @Param('invoiceId') invoiceId: string,
    @Body('type') type: PaymentType = PaymentType.DEPOSIT
  ): Promise<any> {
    return this.paymentService.createPayOSLink(invoiceId, type);
  }

  @Post('/webhook/payos')
  @ApiOperation({ summary: 'Xử lý webhook PayOS' })
  @ApiResponse({ status: 200, description: 'Webhook đã được xử lý thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu webhook không hợp lệ' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  async handlePayOSWebhook(@Body() payload: PayOSWebhookDto): Promise<any> {
    return this.paymentService.handlePayOSWebhook(payload);
  }

  @Get('/invoice/:invoiceId')
  @ApiOperation({ summary: 'Lấy danh sách thanh toán của hóa đơn' })
  @ApiResponse({ status: 200, description: 'Danh sách thanh toán của hóa đơn', type: [Payment] })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hóa đơn' })
  async getPaymentsByInvoice(@Param('invoiceId') invoiceId: string): Promise<Payment[]> {
    return await this.paymentService.findAll({ invoiceId });
  }
}