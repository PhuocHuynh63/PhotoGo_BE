import { Controller, Get, Post, Body, Patch, Param, Delete, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { FindSubscriptionDto } from './dto/find-subscription.dto';
import { Subscription } from './entities/subscription.entity';
import { Public } from 'src/decorator/custom';
import { SubscriptionPaymentService } from './subscription-payment.service';
import { SubscriptionInvoiceStatus } from '../../constants/subscription.enum';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPaymentCallbackDto } from './dto/subscription-payment-callback.dto';
import { SubscriptionStatus } from '../../constants/subscription.enum';
import { PaymentType } from '../../constants/payment.enum';
import { SubscriptionHistoryService } from './subscription-history.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@ApiBearerAuth('access-token')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly subscriptionPaymentService: SubscriptionPaymentService,
    private readonly subscriptionPlanService: SubscriptionPlanService,
    private readonly subscriptionHistoryService: SubscriptionHistoryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo gói đăng ký mới' })
  @ApiResponse({ status: 201, description: 'Gói đăng ký đã được tạo thành công', type: Subscription })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async create(@Body() createSubscriptionDto: CreateSubscriptionDto): Promise<Subscription> {
    return this.subscriptionService.create(createSubscriptionDto);
  }

  @Post('pay')
  @ApiOperation({ summary: 'Tạo link thanh toán PayOS cho subscription' })
  async createPayOSLink(@Body() body: { userId: string; subscriptionId: string }) {
    const { userId, subscriptionId } = body;
    
    // Lấy subscription
    const subscription = await this.subscriptionService.findOne(subscriptionId);
    if (!subscription) throw new NotFoundException('Không tìm thấy subscription');

    // Lấy plan để lấy giá
    const plan = await this.subscriptionPlanService.findOne(subscription.planId);
    if (!plan) throw new NotFoundException('Không tìm thấy subscription plan');

    // Tạo invoice mới
    const invoiceRepo = (this as any).subscriptionPaymentService['subscriptionInvoiceRepository'];
    let invoice = await invoiceRepo.findOne({ where: { subscriptionId, status: SubscriptionInvoiceStatus.PENDING } });
    if (!invoice) {
      invoice = invoiceRepo.create({
        subscriptionId,
        payablePrice: plan.price,
        status: SubscriptionInvoiceStatus.PENDING,
      });
      invoice = await invoiceRepo.save(invoice);
    }

    // Tạo link thanh toán
    const result = await this.subscriptionPaymentService.createPayOSLinkForSubscriptionInvoice(invoice.id);
    return result;
  }

  @Post('payos-callback')
  @Public()
  @ApiOperation({ summary: 'Callback từ PayOS sau khi thanh toán' })
  async handlePayOSCallback(
    @Query() query: { subscriptionPaymentId: string },
    @Body() callbackData: SubscriptionPaymentCallbackDto
  ) {
    return await this.subscriptionPaymentService.handlePayOSCallback({
      ...callbackData,
      subscriptionPaymentId: query.subscriptionPaymentId
    });
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
    const invoiceRepo = (this as any).subscriptionPaymentService['subscriptionInvoiceRepository'];
    const pendingInvoice = await invoiceRepo.findOne({ 
      where: { subscriptionId: id, status: SubscriptionInvoiceStatus.PENDING } 
    });
    
    if (pendingInvoice) {
      throw new BadRequestException('Đã có hóa đơn chờ thanh toán, vui lòng thanh toán trước khi gia hạn');
    }

    // Lấy plan để lấy giá
    const plan = await this.subscriptionPlanService.findOne(subscription.planId);
    if (!plan) throw new NotFoundException('Không tìm thấy subscription plan');

    // Tạo invoice mới cho gia hạn
    const invoice = invoiceRepo.create({
      subscriptionId: id,
      payablePrice: plan.price,
      status: SubscriptionInvoiceStatus.PENDING,
    });
    const savedInvoice = await invoiceRepo.save(invoice);

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