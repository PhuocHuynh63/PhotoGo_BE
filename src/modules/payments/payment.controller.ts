import { Controller, Post, Get, Param, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FindAllPaymentsDto } from './dto/find-all-payments.dto';
import { Payment } from './entities/payment.entity';
import { CreatePayosDto } from './dto/create-payos.dto';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: 201, description: 'Payment created successfully', type: Payment })
  async create(@Body() createPaymentDto: CreatePaymentDto): Promise<Payment> {
    return await this.paymentService.create(createPaymentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all payments' })
  @ApiResponse({ status: 200, description: 'List of payments', type: [Payment] })
  async findAll(@Query() query: FindAllPaymentsDto): Promise<Payment[]> {
    return await this.paymentService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment details', type: Payment })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async findOne(@Param('id') id: string): Promise<Payment> {
    return await this.paymentService.findOne(id);
  }

  @Post('/:invoiceId/payos/link')
  @ApiOperation({ summary: 'Create a PayOS payment link' })
  @ApiResponse({ status: 201, description: 'Payment link created successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createPayOSLink(@Param('invoiceId') invoiceId: string): Promise<any> {
    console.log(`Received invoiceId controller:`, invoiceId);
    return this.paymentService.createPayOSLink(invoiceId);
  }

  @Post('/webhook/payos')
  @ApiOperation({ summary: 'Handle PayOS webhook' })
  @ApiResponse({ status: 200, description: 'Webhook handled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async handlePayOSWebhook(@Body() payload: any): Promise<any> {
    return this.paymentService.handlePayOSWebhook(payload);
  }
}