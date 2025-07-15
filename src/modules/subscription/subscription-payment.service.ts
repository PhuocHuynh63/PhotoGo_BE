import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionInvoice } from './entities/subscription-invoice.entity';
import { SubscriptionPayment } from './entities/subscription-payment.entity';
import { PaymentMethod, PaymentStatus, PaymentType, PayerType } from '../../constants/payment.enum';
import { PayOSService } from '../../3rdService/payos/payos.service';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionStatus, BillingCycle, SubscriptionInvoiceStatus } from '../../constants/subscription.enum';
import { SubscriptionPaymentCallbackDto } from './dto/subscription-payment-callback.dto';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionHistoryService } from './subscription-history.service';
import { SubscriptionHistoryAction } from '../../constants/subscription.enum';
import { MailService } from '../../3rdService/mail/mail.service';
import { UserService } from '../users/user.service';

@Injectable()
export class SubscriptionPaymentService {
  private readonly logger = new Logger(SubscriptionPaymentService.name);

  constructor(
    @InjectRepository(SubscriptionInvoice)
    private readonly subscriptionInvoiceRepository: Repository<SubscriptionInvoice>,
    @InjectRepository(SubscriptionPayment)
    private readonly subscriptionPaymentRepository: Repository<SubscriptionPayment>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly payosService: PayOSService,
    private readonly subscriptionPlanService: SubscriptionPlanService,
    private readonly subscriptionHistoryService: SubscriptionHistoryService,
    private readonly mailService: MailService,
    private readonly userService: UserService,
  ) {}

  async createPayOSLinkForSubscriptionInvoice(
    invoiceId: string, 
    type: PaymentType = PaymentType.FULL_PAYMENT,
    payerType: PayerType = PayerType.CUSTOMER,
    userId?: string,
    vendorId?: string
  ) {
    const invoice = await this.subscriptionInvoiceRepository.findOne({ 
      where: { id: invoiceId },
      relations: ['subscription']
    });
    if (!invoice) throw new NotFoundException('Không tìm thấy subscription invoice');
    if (invoice.status !== SubscriptionInvoiceStatus.PENDING) throw new BadRequestException('Invoice không hợp lệ');

    // Validate payerType và thông tin tương ứng
    if (payerType === PayerType.CUSTOMER && !userId) {
      throw new BadRequestException('userId là bắt buộc khi payerType là CUSTOMER');
    }
    if (payerType === PayerType.VENDOR && !vendorId) {
      throw new BadRequestException('vendorId là bắt buộc khi payerType là VENDOR');
    }

    // Cập nhật payerType cho invoice
    invoice.payerType = payerType;
    await this.subscriptionInvoiceRepository.save(invoice);

    // Tạo payment record
    const payment = this.subscriptionPaymentRepository.create({
      subscriptionInvoiceId: invoice.id,
      amount: invoice.payablePrice,
      status: PaymentStatus.PENDING,
      type,
      paymentMethod: PaymentMethod.PAYOS,
      payerType,
    });
    const savedPayment = await this.subscriptionPaymentRepository.save(payment);

    // Tạo description dựa trên payerType
    const payerDescription = payerType === PayerType.CUSTOMER 
      ? `Thanh toán subscription invoice ${invoice.id} - Khách hàng`
      : `Thanh toán subscription invoice ${invoice.id} - Nhà cung cấp`;

    // Gọi PayOS để tạo link thanh toán
    const payosResult = await this.payosService.createPaymentLink({
      orderCode: parseInt(savedPayment.id.replace(/-/g, '').substring(0, 10)), // Convert UUID to number
      amount: invoice.payablePrice,
      description: payerDescription,
      cancelUrl: `https://photogo.id.vn/payment/error?subscriptionPaymentId=${savedPayment.id}&payerType=${payerType}`,
      returnUrl: `https://photogo.id.vn/payment/successful?subscriptionPaymentId=${savedPayment.id}&payerType=${payerType}`,
    });

    // Lưu paymentOSId vào payment
    savedPayment.paymentOSId = payosResult.data?.paymentId || payosResult.paymentId;
    await this.subscriptionPaymentRepository.save(savedPayment);

    return {
      paymentLink: payosResult.data?.checkoutUrl || payosResult.checkoutUrl,
      paymentId: savedPayment.id,
      payerType: savedPayment.payerType,
      invoiceId: invoice.id,
      amount: invoice.payablePrice,
    };
  }

  async handlePayOSCallback(callbackData: SubscriptionPaymentCallbackDto) {

    const { orderCode, status, subscriptionPaymentId, cancel, userId, vendorId, payerType } = callbackData;

    // Tìm payment theo subscriptionPaymentId hoặc orderCode
    let payment;
    if (subscriptionPaymentId) {
      payment = await this.subscriptionPaymentRepository.findOne({
        where: { id: subscriptionPaymentId },
        relations: ['subscriptionInvoice', 'subscriptionInvoice.subscription'],
      });
    } else if (orderCode) {
      // Tìm payment theo paymentOSId (orderCode từ PayOS)
      payment = await this.subscriptionPaymentRepository.findOne({
        where: { paymentOSId: orderCode.toString() },
        relations: ['subscriptionInvoice', 'subscriptionInvoice.subscription'],
      });
    }

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Xác định trạng thái thanh toán
    let paymentStatus: PaymentStatus;
    let historyAction: SubscriptionHistoryAction;
    let description: string;

    if (cancel) {
      // User hủy thanh toán
      paymentStatus = PaymentStatus.FAILED;
      historyAction = SubscriptionHistoryAction.PAYMENT_CANCELLED;
      description = `Người dùng hủy thanh toán cho invoice ${payment.subscriptionInvoice.id}`;
    } else if (status === SubscriptionInvoiceStatus.PAID) {
      // Thanh toán thành công
      paymentStatus = PaymentStatus.PAID;
      historyAction = SubscriptionHistoryAction.PAYMENT_SUCCESS;
      description = `Thanh toán thành công cho invoice ${payment.subscriptionInvoice.id}`;
    } else {
      // Thanh toán thất bại
      paymentStatus = PaymentStatus.FAILED;
      historyAction = SubscriptionHistoryAction.PAYMENT_FAILED;
      description = `Thanh toán thất bại cho invoice ${payment.subscriptionInvoice.id}`;
    }

    // Cập nhật status payment
    payment.status = paymentStatus;
    if (status === SubscriptionInvoiceStatus.PAID) {
      payment.transactionId = subscriptionPaymentId;
    }
    await this.subscriptionPaymentRepository.save(payment);

    // Cập nhật status invoice
    const invoice = payment.subscriptionInvoice;
    if (status === SubscriptionInvoiceStatus.PAID) {
      invoice.status = SubscriptionInvoiceStatus.PAID;
    } else {
      invoice.status = SubscriptionInvoiceStatus.CANCELED;
    }
    await this.subscriptionInvoiceRepository.save(invoice);

    // Tạo history record cho payment
    await this.subscriptionHistoryService.createHistory(
      invoice.subscriptionId,
      historyAction,
      description,
      {
        paymentId: payment.id,
        invoiceId: invoice.id,
        amount: payment.amount,
        paymentType: payment.type,
        paymentMethod: payment.paymentMethod,
        payerType: payment.payerType,
        transactionId: payment.transactionId,
        paymentOSId: payment.paymentOSId,
        status: payment.status,
        isCancelled: cancel || false,
        payosStatus: status,
        timestamp: new Date().toISOString(),
      },
      payment.payerType
    );

    // Nếu thanh toán thành công, cập nhật subscription
    if (status === SubscriptionInvoiceStatus.PAID) {
      const subscription = invoice.subscription;
      const oldEndDate = new Date(subscription.endDate);
      
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.lastBilledAt = new Date();
      
        // Tự động assign user/vendor dựa trên payerType
        if (payerType === PayerType.CUSTOMER && userId && !subscription.userId) {
          subscription.userId = userId;
        }
        // Note: Vendor assignment được xử lý qua SubscriptionVendor entity
      
      // Tính next billing date dựa trên billing cycle
      const nextBillingDate = new Date();
      if (subscription.billingCycle === BillingCycle.MONTHLY) {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      } else if (subscription.billingCycle === BillingCycle.YEARLY) {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      }
      subscription.nextBillingAt = nextBillingDate;

      // Gia hạn subscription: cộng thêm thời gian vào endDate
      const plan = await this.subscriptionPlanService.findOne(subscription.planId);
      if (plan) {
        // Cộng thêm số ngày từ plan.duration
        const newEndDate = new Date(oldEndDate);
        newEndDate.setDate(newEndDate.getDate() + plan.duration);
        subscription.endDate = newEndDate;

        // Xác định loại action dựa trên payment type
        const isRenewal = payment.type === PaymentType.RENEWAL;
        const renewalAction = isRenewal ? SubscriptionHistoryAction.RENEWED : SubscriptionHistoryAction.ACTIVATED;
        const renewalDescription = isRenewal 
          ? `Gia hạn subscription thêm ${plan.duration} ngày`
          : `Kích hoạt subscription mới với ${plan.duration} ngày`;

        // Tự động assign user với subscription nếu là lần thanh toán đầu tiên
        if (!isRenewal) {
                  // Tạo history record cho việc assign user
        await this.subscriptionHistoryService.createHistory(
          subscription.id,
          SubscriptionHistoryAction.ACTIVATED,
          `Kích hoạt và assign user với subscription`,
          {
            subscriptionId: subscription.id,
            userId: subscription.userId,
            planId: plan.id,
            planName: plan.name,
            planDuration: plan.duration,
            planPrice: plan.price,
            startDate: subscription.startDate.toISOString(),
            endDate: newEndDate.toISOString(),
            billingCycle: subscription.billingCycle,
            status: subscription.status,
            paymentId: payment.id,
            invoiceId: invoice.id,
            amount: payment.amount,
            payerType: payment.payerType,
            timestamp: new Date().toISOString(),
            action: 'user_assignment',
            isFirstPayment: true,
            assignedUserId: userId || subscription.userId,
          },
          payment.payerType
        );
        } else {
          // Tạo history record cho gia hạn
          await this.subscriptionHistoryService.createHistory(
            subscription.id,
            renewalAction,
            renewalDescription,
            {
              // Thông tin subscription
              subscriptionId: subscription.id,
              userId: subscription.userId,
              
              // Thông tin plan
              planId: plan.id,
              planName: plan.name,
              planDescription: plan.description,
              planDuration: plan.duration,
              planPrice: plan.price,
              
              // Thông tin thời gian
              oldEndDate: oldEndDate.toISOString(),
              newEndDate: newEndDate.toISOString(),
              extensionDays: plan.duration,
              billingCycle: subscription.billingCycle,
              lastBilledAt: subscription.lastBilledAt.toISOString(),
              nextBillingAt: subscription.nextBillingAt.toISOString(),
              
              // Thông tin thanh toán
              paymentId: payment.id,
              invoiceId: invoice.id,
              amount: payment.amount,
              paymentType: payment.type,
              paymentMethod: payment.paymentMethod,
              payerType: payment.payerType,
              transactionId: payment.transactionId,
              paymentOSId: payment.paymentOSId,
              
              // Metadata khác
              timestamp: new Date().toISOString(),
              action: isRenewal ? SubscriptionHistoryAction.RENEWED : SubscriptionHistoryAction.ACTIVATED,
              isFirstPayment: !isRenewal,
            },
            payment.payerType
          );
        }
      }

      await this.subscriptionRepository.save(subscription);

      // Gửi email thông báo thành công cho customer
      if (payerType === PayerType.CUSTOMER && userId) {
        try {
          const customerEmail = await this.getUserEmail(userId);
          const customerName = await this.getUserName(userId);
          
          await this.mailService.sendSubscriptionSuccessEmail(
            customerEmail,
            customerName,
            {
              subscriptionId: subscription.id,
              planName: plan.name,
              startDate: subscription.startDate,
              endDate: subscription.endDate,
              billingCycle: subscription.billingCycle,
              status: subscription.status,
              price: plan.price,
              paymentMethod: payment.paymentMethod,
              nextBillingDate: subscription.nextBillingAt,
            }
          );
        } catch (error) {
          this.logger.error(`Failed to send subscription success email: ${error.message}`);
          // Không throw error để không ảnh hưởng đến flow thanh toán
        }
      }
    }

    return {
      success: status === SubscriptionInvoiceStatus.PAID,
      cancelled: cancel || false,
      subscriptionPaymentId: payment.id,
      invoiceId: invoice.id,
      subscriptionId: invoice.subscriptionId,
      isRenewal: payment.type === PaymentType.RENEWAL,
      paymentStatus: payment.status,
      payosStatus: status,
      payerType: payment.payerType,
      userIdAssigned: payerType === PayerType.CUSTOMER ? (userId || null) : null,
      vendorIdAssigned: payerType === PayerType.VENDOR ? (vendorId || null) : null,
    };
  }

  /**
   * Xác định payerType dựa trên thông tin có sẵn
   */
  private determinePayerType(userId?: string, vendorId?: string): PayerType {
    if (vendorId) {
      return PayerType.VENDOR;
    }
    if (userId) {
      return PayerType.CUSTOMER;
    }
    return PayerType.CUSTOMER; // Default
  }

  /**
   * Validate thông tin payer
   */
  private validatePayerInfo(payerType: PayerType, userId?: string, vendorId?: string): void {
    if (payerType === PayerType.CUSTOMER && !userId) {
      throw new BadRequestException('userId là bắt buộc khi payerType là CUSTOMER');
    }
    if (payerType === PayerType.VENDOR && !vendorId) {
      throw new BadRequestException('vendorId là bắt buộc khi payerType là VENDOR');
    }
  }

  /**
   * Lấy thông tin user email
   */
  private async getUserEmail(userId: string): Promise<string> {
    try {
      const user = await this.userService.findOne(userId);
      return user.email;
    } catch (error) {
      this.logger.error(`Failed to get user email for userId ${userId}: ${error.message}`);
      return 'customer@example.com'; // Fallback email
    }
  }

  /**
   * Lấy tên user
   */
  private async getUserName(userId: string): Promise<string> {
    try {
      const user = await this.userService.findOne(userId);
      return user.fullName || user.email;
    } catch (error) {
      this.logger.error(`Failed to get user name for userId ${userId}: ${error.message}`);
      return 'Khách hàng'; // Fallback name
    }
  }

  async getPaymentById(paymentId: string) {
    const payment = await this.subscriptionPaymentRepository.findOne({
      where: { id: paymentId },
      relations: ['subscriptionInvoice']
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async getInvoicePayments(invoiceId: string) {
    const payments = await this.subscriptionPaymentRepository.find({
      where: { subscriptionInvoiceId: invoiceId },
      order: { createdAt: 'DESC' }
    });

    return payments;
  }
} 