import { Controller, Get, Post, Body, Patch, Param, Delete, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { FindSubscriptionDto } from './dto/find-subscription.dto';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionInvoice } from './entities/subscription-invoice.entity';
import { Public } from 'src/decorator/custom';
import { SubscriptionPaymentService } from './subscription-payment.service';
import { SubscriptionInvoiceStatus } from '../../constants/subscription.enum';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPaymentCallbackDto } from './dto/subscription-payment-callback.dto';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { SubscriptionStatus } from '../../constants/subscription.enum';
import { PaymentType, PayerType } from '../../constants/payment.enum';
import { SubscriptionHistoryService } from './subscription-history.service';
import { UserService } from '../users/user.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@ApiBearerAuth('access-token')
export class SubscriptionController {
  constructor(
    @InjectRepository(SubscriptionInvoice)
    private readonly subscriptionInvoiceRepository: Repository<SubscriptionInvoice>,
    private readonly subscriptionService: SubscriptionService,
    private readonly subscriptionPaymentService: SubscriptionPaymentService,
    private readonly subscriptionPlanService: SubscriptionPlanService,
    private readonly subscriptionHistoryService: SubscriptionHistoryService,
    // private readonly userService: UserService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo gói đăng ký mới' })
  @ApiResponse({ status: 201, description: 'Gói đăng ký đã được tạo thành công', type: Subscription })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async create(@Body() createSubscriptionDto: CreateSubscriptionDto): Promise<Subscription> {
    return this.subscriptionService.create(createSubscriptionDto);
  }

  @Post('create-payment-link')
  @ApiOperation({ summary: 'Tạo link thanh toán cho subscription invoice' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  createPaymentLink(@Body() createPaymentLinkDto: CreatePaymentLinkDto) {
    return this.subscriptionPaymentService.createPayOSLinkForSubscriptionInvoice(
      createPaymentLinkDto.invoiceId,
      createPaymentLinkDto.type,
      createPaymentLinkDto.payerType,
      createPaymentLinkDto.userId,
      createPaymentLinkDto.vendorId
    );
  }

  @Post('pay')
  @ApiOperation({ summary: 'Tạo link thanh toán PayOS cho subscription (legacy)' })
  async createPayOSLink(@Body() body: { userId: string; subscriptionId: string }) {
    const { userId, subscriptionId } = body;
    
    // Lấy subscription
    const subscription = await this.subscriptionService.findOne(subscriptionId);
    if (!subscription) throw new NotFoundException('Không tìm thấy subscription');

    // Lấy plan để lấy giá
    const plan = await this.subscriptionPlanService.findOne(subscription.planId);
    if (!plan) throw new NotFoundException('Không tìm thấy subscription plan');

    // Tạo invoice mới
    let invoice = await this.subscriptionInvoiceRepository.findOne({ where: { subscriptionId, status: SubscriptionInvoiceStatus.PENDING } });
    if (!invoice) {
      invoice = this.subscriptionInvoiceRepository.create({
        subscriptionId,
        payablePrice: plan.price,
        status: SubscriptionInvoiceStatus.PENDING,
      });
      invoice = await this.subscriptionInvoiceRepository.save(invoice);
    }

    // Tạo link thanh toán với payerType mặc định là CUSTOMER
    const result = await this.subscriptionPaymentService.createPayOSLinkForSubscriptionInvoice(
      invoice.id,
      PaymentType.FULL_PAYMENT,
      PayerType.CUSTOMER,
      userId
    );
    return result;
  }

  @Post('payos-callback')
  @Public()
  @ApiOperation({ summary: 'Callback từ PayOS sau khi thanh toán (legacy)' })
  async handlePayOSCallback(
    @Query() query: { subscriptionPaymentId: string },
    @Body() callbackData: SubscriptionPaymentCallbackDto
  ) {
    return await this.subscriptionPaymentService.handlePayOSCallback({
      ...callbackData,
      subscriptionPaymentId: query.subscriptionPaymentId
    });
  }

  @Post('payment-callback')
  @Public()
  @ApiOperation({ summary: 'Callback từ PayOS sau khi thanh toán' })
  @ApiResponse({ status: 200, description: 'Xử lý thành công' })
  handlePaymentCallback(@Body() callbackData: SubscriptionPaymentCallbackDto) {
    return this.subscriptionPaymentService.handlePayOSCallback(callbackData);
  }

  @Get('payment/:paymentId/status')
  @ApiOperation({ summary: 'Kiểm tra trạng thái thanh toán' })
  @ApiParam({ name: 'paymentId', description: 'ID của payment' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getPaymentStatus(@Param('paymentId') paymentId: string) {
    const payment = await this.subscriptionPaymentService.getPaymentById(paymentId);
    return {
      paymentId,
      status: payment.status,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      payerType: payment.payerType,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt
    };
  }

  @Get('invoice/:invoiceId/payments')
  @ApiOperation({ summary: 'Lấy danh sách payments của invoice' })
  @ApiParam({ name: 'invoiceId', description: 'ID của invoice' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getInvoicePayments(@Param('invoiceId') invoiceId: string) {
    const payments = await this.subscriptionPaymentService.getInvoicePayments(invoiceId);
    return { 
      invoiceId, 
      payments: payments,
      totalPayments: payments.length
    };
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Gia hạn subscription' })
  async renewSubscription(@Param('id') id: string) {
    // Lấy subscription hiện tại
    const subscription = await this.subscriptionService.findOne(id);
    if (!subscription) throw new NotFoundException('Không tìm thấy subscription');

    // Kiểm tra subscription có thể gia hạn không
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Subscription không trong trạng thái active');
    }

    // Kiểm tra xem có invoice pending nào không
    const pendingInvoice = await this.subscriptionInvoiceRepository.findOne({ 
      where: { subscriptionId: id, status: SubscriptionInvoiceStatus.PENDING } 
    });
    
    if (pendingInvoice) {
      throw new BadRequestException('Đã có hóa đơn chờ thanh toán, vui lòng thanh toán trước khi gia hạn');
    }

    // Lấy plan để lấy giá
    const plan = await this.subscriptionPlanService.findOne(subscription.planId);
    if (!plan) throw new NotFoundException('Không tìm thấy subscription plan');

    // Tạo invoice mới cho gia hạn
    const invoice = this.subscriptionInvoiceRepository.create({
      subscriptionId: id,
      payablePrice: plan.price,
      status: SubscriptionInvoiceStatus.PENDING,
    });
    const savedInvoice = await this.subscriptionInvoiceRepository.save(invoice);

    // Tạo link thanh toán cho gia hạn
    const result = await this.subscriptionPaymentService.createPayOSLinkForSubscriptionInvoice(
      savedInvoice.id, 
      PaymentType.RENEWAL
    );

    return {
      ...result,
      message: 'Tạo link thanh toán gia hạn thành công',
      currentEndDate: subscription.endDate,
      renewalAmount: plan.price
    };
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách gói đăng ký' })
  @ApiResponse({ status: 200, description: 'Danh sách gói đăng ký đã được lấy thành công', type: [Subscription] })
  async findAll(@Query() findSubscriptionDto: FindSubscriptionDto): Promise<{
    data: Subscription[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.subscriptionService.findAll(findSubscriptionDto);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Lấy thông tin gói đăng ký theo ID' })
  @ApiResponse({ status: 200, description: 'Gói đăng ký đã được tìm thấy', type: Subscription })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói đăng ký' })
  async findOne(@Param('id') id: string): Promise<Subscription> {
    return this.subscriptionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật gói đăng ký' })
  @ApiResponse({ status: 200, description: 'Gói đăng ký đã được cập nhật thành công', type: Subscription })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói đăng ký' })
  async update(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    return this.subscriptionService.update(id, updateSubscriptionDto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Hủy gói đăng ký' })
  @ApiResponse({ status: 200, description: 'Gói đăng ký đã được hủy thành công', type: Subscription })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói đăng ký' })
  async cancel(@Param('id') id: string): Promise<Subscription> {
    return this.subscriptionService.cancel(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa gói đăng ký' })
  @ApiResponse({ status: 200, description: 'Gói đăng ký đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói đăng ký' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.subscriptionService.remove(id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Lấy lịch sử subscription' })
  async getSubscriptionHistory(@Param('id') id: string) {
    // Kiểm tra subscription tồn tại
    const subscription = await this.subscriptionService.findOne(id);
    if (!subscription) throw new NotFoundException('Không tìm thấy subscription');

    // Lấy lịch sử
    const history = await this.subscriptionHistoryService.findBySubscriptionId(id);
    
    return {
      subscriptionId: id,
      history: history,
      totalRecords: history.length
    };
  }

} 