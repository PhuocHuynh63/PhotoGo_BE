import { Controller, Post, Get, Param, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FindAllPaymentsDto } from './dto/find-all-payments.dto';
import { Payment } from './entities/payment.entity';
import { PayOSWebhookDto } from './dto/payos-webhook.dto';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@Controller('payments')
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

  @Post('/:invoiceId/payos/link')
  @ApiOperation({ summary: 'Tạo liên kết thanh toán PayOS' })
  @ApiResponse({ status: 201, description: 'Liên kết thanh toán được tạo thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hóa đơn' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  async createPayOSLink(@Param('invoiceId') invoiceId: string): Promise<any> {
    console.log(`Received invoiceId controller:`, invoiceId);
    return this.paymentService.createPayOSLink(invoiceId);
  }

@Post('/webhook/payos')
@ApiOperation({ summary: 'Xử lý webhook PayOS' })
@ApiResponse({ status: 200, description: 'Webhook đã được xử lý thành công' })
@ApiResponse({ status: 400, description: 'Dữ liệu webhook không hợp lệ' })
@ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
async handlePayOSWebhook(@Body() payload: PayOSWebhookDto): Promise<any> {
  return this.paymentService.handlePayOSWebhook(payload);
}
  
}