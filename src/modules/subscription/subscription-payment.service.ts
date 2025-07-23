import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionInvoice } from './entities/subscription-invoice.entity';
import { SubscriptionPayment } from './entities/subscription-payment.entity';
import { PaymentMethod, PaymentStatus, PaymentType, PayerType } from '../../constants/payment.enum';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionStatus, BillingCycle, SubscriptionInvoiceStatus } from '../../constants/subscription.enum';
import { SubscriptionPaymentCallbackDto } from './dto/subscription-payment-callback.dto';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionHistoryService } from './subscription-history.service';
import { SubscriptionHistoryAction } from '../../constants/subscription.enum';
import { MailService } from '../../3rdService/mail/mail.service';
import { UserService } from '../users/user.service';
import { VendorService } from '../vendors/vendor.service';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { Role } from '../roles/entities/role.entity';
import { SubscriptionService } from './subscription.service';
import { SubscriptionVendorService } from './subscription-vendor.service';
import PayOS from '@payos/node';

// Helper: Chuyển đổi an toàn sang ISO string
function toISOStringSafe(date: any) {
  if (!date) return null;
  if (date instanceof Date) return date.toISOString();
  try {
    return new Date(date).toISOString();
  } catch {
    return null;
  }
}

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
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepository: Repository<SubscriptionPlan>,
    // Bỏ payOSService, inject trực tiếp SDK
    @Inject('PAYOS_CLIENT') private readonly payos: PayOS,
    private readonly subscriptionPlanService: SubscriptionPlanService,
    private readonly subscriptionHistoryService: SubscriptionHistoryService,
    private readonly mailService: MailService,
    private readonly userService: UserService,
    private readonly vendorService: VendorService,
    private readonly subscriptionVendorService: SubscriptionVendorService, // Inject service
    @Inject(forwardRef(() => SubscriptionService))
    private readonly subscriptionService: SubscriptionService,
  ) { }

  async createPayOSLinkForSubscriptionInvoice(
    planId: string,
    type: PaymentType = PaymentType.FULL_PAYMENT,
    userId?: string,
    // vendorId?: string
  ) {
    const plan = await this.subscriptionPlanRepository.findOne({
      where: { id: planId },
      relations: ['subscriptions']
    });
    if (!plan) throw new NotFoundException('Không tìm thấy subscription plan');
    if (plan.isActive !== true) throw new BadRequestException('Plan không hợp lệ');

    // Xác định payerType dựa vào check role của user
    let payerType: PayerType;
    if (userId) {
      const user = await this.userService.findOne(userId);
      console.log('DEBUG user role name:', user.role.name);
      if (user.role.name === 'vendor-owner') payerType = PayerType.VENDOR;
      else payerType = PayerType.CUSTOMER;
    }
    else throw new BadRequestException('Phải truyền userId hoặc vendorId');

    // Validate payerType và thông tin tương ứng
    if (payerType === PayerType.CUSTOMER && !userId) {
      throw new BadRequestException('userId là bắt buộc khi payerType là CUSTOMER');
    }
    // if (payerType === PayerType.VENDOR && !vendorId) {
    //   throw new BadRequestException('vendorId là bắt buộc khi payerType là VENDOR');
    // }

    // Lấy giá theo billingCycle
    let price = 0;
    if (plan.billingCycle === BillingCycle.MONTHLY) {
      price = plan.priceForMonth;
    } else if (plan.billingCycle === BillingCycle.YEARLY) {
      price = plan.priceForYear;
    }
    // Tạo subscription mới với status PENDING
    const now = new Date();
    const tempEndDate = plan.billingCycle === BillingCycle.MONTHLY ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const subscription = this.subscriptionRepository.create({
      planId: plan.id,
      billingCycle: plan.billingCycle,
      status: SubscriptionStatus.PENDING,
      startDate: now,
      endDate: tempEndDate,
      userId: payerType === PayerType.CUSTOMER ? userId : undefined,
      // vendorId: nếu cần
    });
    await this.subscriptionRepository.save(subscription);
    // Tạo subscription invoice, gán subscriptionId
    const invoice = this.subscriptionInvoiceRepository.create({
      subscriptionId: subscription.id,
      payablePrice: price,
      status: SubscriptionInvoiceStatus.PENDING,
      payerType,
    });
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

    // Lưu history cho việc tạo payment
    await this.subscriptionHistoryService.createHistory(
      invoice.subscriptionId,
      SubscriptionHistoryAction.CREATED,
      'Tạo payment chờ thanh toán',
      {
        paymentId: savedPayment.id,
        invoiceId: invoice.id,
        amount: savedPayment.amount,
        payerType,
        status: savedPayment.status,
        paymentMethod: savedPayment.paymentMethod,
        timestamp: new Date().toISOString(),
        action: 'chờ thanh toán',
      },
      payerType
    );

    // Tạo description dựa trên payerType
    const payerDescription = payerType === PayerType.CUSTOMER
      ? `subscription - Khách hàng`
      : `subscription - Nhà cung cấp`;

    const idWithoutHyphens = savedPayment.id.replace(/-/g, '');
    const hexString = idWithoutHyphens.slice(-13);
    const orderCode = parseInt(hexString, 16);

    const amount = Number(invoice.payablePrice);
    const description = payerDescription.slice(0, 50); // PayOS cho phép tới 50 ký tự
    const cancelUrl = `https://photogo.id.vn/payment/error?subscriptionPaymentId=${savedPayment.id}&payerType=${payerType}`;
    const returnUrl = `https://photogo.id.vn/payment/successful?subscriptionPaymentId=${savedPayment.id}&payerType=${payerType}`;

    const payosPayload = {
      orderCode,
      amount,
      description,
      cancelUrl,
      returnUrl
    };

    console.log('DEBUG payosPayload:', payosPayload);

    // Gọi PayOS SDK để tạo link thanh toán
    let payosResult;
    try {
      payosResult = await this.payos.createPaymentLink(payosPayload);
    } catch (error) {
      console.log('PayOS error:', error);
      throw new BadRequestException('Lỗi khi tạo liên kết thanh toán: ' + (error?.message || 'PayOS error'));
    }
    // Kiểm tra kết quả trả về từ PayOS
    const checkoutUrl = payosResult?.checkoutUrl;
    const paymentOSId = payosResult?.paymentLinkId;
    if (!checkoutUrl || !paymentOSId) {
      throw new BadRequestException('Không tạo được link thanh toán: ' + (payosResult?.desc || 'Lỗi không xác định từ PayOS'));
    }
    // Lưu paymentOSId vào payment
    savedPayment.paymentOSId = paymentOSId;
    await this.subscriptionPaymentRepository.save(savedPayment);
    return {
      paymentLink: checkoutUrl,
      paymentOSId,
      paymentId: savedPayment.id,
      payerType: savedPayment.payerType,
      invoiceId: invoice.id,
      amount: invoice.payablePrice,
    };
  }

  async handlePayOSCallback(callbackData: SubscriptionPaymentCallbackDto) {

    const { orderCode, status, subscriptionPaymentId, cancel, userId } = callbackData;
    console.log('DEBUG callbackData:', callbackData);
    // Tìm payment theo subscriptionPaymentId hoặc orderCode
    let payment;
    if (subscriptionPaymentId) {
      payment = await this.subscriptionPaymentRepository.findOne({
        where: { id: subscriptionPaymentId },
        relations: ['subscriptionInvoice', 'subscriptionInvoice.subscription'],
      });
      // } else if (orderCode) {
      //   // Tìm payment theo paymentOSId (orderCode từ PayOS)
      //   payment = await this.subscriptionPaymentRepository.findOne({
      //     where: { paymentOSId: orderCode.toString() },
      //     relations: ['subscriptionInvoice', 'subscriptionInvoice.subscription'],
      //   });
    }

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Xác định payerType dựa trên userId (nếu có)
    let payerType = payment.payerType;
    if (userId) {
      const user = await this.userService.findOne(userId);
      if (user.role && user.role.name === 'vendor-owner') {
        payerType = PayerType.VENDOR;
      } else {
        payerType = PayerType.CUSTOMER;
      }
    }
    console.log('DEBUG payerType:', payerType);
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

    // Nếu thanh toán thành công, tạo subscription mới nếu chưa có
    if (status === SubscriptionInvoiceStatus.PAID) {
      let subscription = invoice.subscription;
      if (!subscription) {
        // Tạo subscription mới
        const plan = await this.subscriptionPlanService.findOne(invoice.planId);
        subscription = this.subscriptionRepository.create({
          planId: plan.id,
          billingCycle: plan.billingCycle,
          status: SubscriptionStatus.ACTIVE,
          startDate: new Date(),
          endDate: plan.billingCycle === BillingCycle.MONTHLY ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          userId: payerType === PayerType.CUSTOMER ? userId : undefined,
          // vendorId: nếu cần
        });
        await this.subscriptionRepository.save(subscription);
        // Cập nhật lại invoice với subscriptionId
        invoice.subscriptionId = subscription.id;
        await this.subscriptionInvoiceRepository.save(invoice);
      }

      // --- BỔ SUNG: Nếu là CUSTOMER và có userId, cập nhật multiplier ---
      if (payerType === PayerType.CUSTOMER && userId) {
        try {
          const user = await this.userService.findOne(userId);
          if (user) {
            user.multiplier = 1.5;
            await this.userService.update(user.id, { multiplier: 1.5 });
          }
        } catch (err) {
          this.logger.error(`Không thể cập nhật multiplier cho user: ${userId} - ${err.message}`);
        }
      }

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
      let extensionDays = 30;
      let planPrice = 0;
      if (plan) {
        if (plan.billingCycle === BillingCycle.MONTHLY) {
          extensionDays = 30;
          planPrice = plan.priceForMonth;
        } else if (plan.billingCycle === BillingCycle.YEARLY) {
          extensionDays = 365;
          planPrice = plan.priceForYear;
        }
        const newEndDate = new Date(oldEndDate);
        if (plan.billingCycle === BillingCycle.MONTHLY) {
          newEndDate.setMonth(newEndDate.getMonth() + 1);
        } else if (plan.billingCycle === BillingCycle.YEARLY) {
          newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        } else {
          newEndDate.setMonth(newEndDate.getMonth() + 1);
        }
        subscription.endDate = newEndDate;

        // Xác định loại action dựa trên payment type
        const isRenewal = payment.type === PaymentType.RENEWAL;
        const renewalAction = isRenewal ? SubscriptionHistoryAction.RENEWED : SubscriptionHistoryAction.ACTIVATED;

        // Calculate duration based on billing cycle
        const planDuration = plan.billingCycle === BillingCycle.MONTHLY ? 30 : 365;
        const renewalDescription = isRenewal
          ? `Gia hạn subscription thêm ${(planDuration || extensionDays)} ngày`
          : `Kích hoạt subscription mới với ${(planDuration || extensionDays)} ngày`;

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

              planDuration: extensionDays,
              planPrice: planPrice,
              startDate: toISOStringSafe(subscription.startDate),
              endDate: toISOStringSafe(newEndDate),
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
          await this.subscriptionHistoryService.createHistory(
            subscription.id,
            renewalAction,
            renewalDescription,
            {
              subscriptionId: subscription.id,
              userId: subscription.userId,
              planId: plan.id,
              planName: plan.name,
              planDescription: plan.description,
              planDuration: extensionDays,
              planPrice: planPrice,
              oldEndDate: toISOStringSafe(oldEndDate),
              newEndDate: toISOStringSafe(newEndDate),
              extensionDays: extensionDays,
              billingCycle: subscription.billingCycle,
              lastBilledAt: toISOStringSafe(subscription.lastBilledAt),
              nextBillingAt: toISOStringSafe(subscription.nextBillingAt),


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

      // --- BỔ SUNG: Nếu là vendor-owner (R008), tự động tạo assignment vào subscription-vendor ---
      if (payerType === PayerType.VENDOR && userId) {
        // Lấy vendor theo userId
        const vendor = await this.vendorService.getVendorByUserID(userId);
        if (vendor) {
          // Kiểm tra đã có assignment chưa
          const existingAssignments = await this.subscriptionVendorService.findByVendorId(vendor.id);
          const hasAssignment = existingAssignments.some(
            (sv) => sv.planId === subscription.planId && sv.isActive
          );
          if (!hasAssignment) {
            await this.subscriptionVendorService.create({
              planId: subscription.planId,
              vendorId: vendor.id,
              joinedDate: new Date(),
              isActive: true,
            });
          }
        }
      }
      // --- END BỔ SUNG ---

      // Schedule renewal reminder if nextBillingAt is set and user exists
      if (subscription.nextBillingAt && subscription.userId && subscription.status === SubscriptionStatus.ACTIVE) {
        try {
          // Use private method to schedule reminder
          await this.scheduleRenewalReminderForSubscription(subscription);
        } catch (error) {
          this.logger.error(`Lỗi khi schedule renewal reminder sau payment: ${error.message}`, error.stack);
          // Don't throw error to avoid affecting payment flow
        }
      }

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
              price: planPrice,
              paymentMethod: payment.paymentMethod,
              nextBillingDate: subscription.nextBillingAt,
            }
          );
        } catch (error) {
          this.logger.error(`Failed to send subscription success email: ${error.message}`);
        }
      }
      // Gửi email thông báo thành công cho vendor
      if (payerType === PayerType.VENDOR && subscription.vendorId) {
        try {
          const vendor = await this.vendorService.findOne(subscription.vendorId);
          const vendorUser = vendor.user_id;
          const vendorEmail = vendorUser?.email || 'vendor@example.com';
          const vendorName = vendorUser?.fullName || vendor.name || 'Nhà cung cấp';
          await this.mailService.sendSubscriptionSuccessVendorEmail(
            vendorEmail,
            vendorName,
            {
              subscriptionId: subscription.id,
              planName: plan.name,
              startDate: subscription.startDate,
              endDate: subscription.endDate,
              billingCycle: subscription.billingCycle,
              status: subscription.status,
              price: planPrice,
              paymentMethod: payment.paymentMethod,
              nextBillingDate: subscription.nextBillingAt,
            }
          );
        } catch (error) {
          this.logger.error(`Failed to send subscription success vendor email: ${error.message}`);
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
      vendorIdAssigned: payerType === PayerType.VENDOR ? (invoice.subscription.vendorId || null) : null,
    };
  }

  //#region scheduleRenewalReminderForSubscription
  /**
   * Đặt lịch nhắc gia hạn cho subscription sau khi thanh toán thành công
   */
  private async scheduleRenewalReminderForSubscription(subscription: Subscription): Promise<void> {
    try {
      if (this.subscriptionService) {
        await this.subscriptionService.scheduleRenewalReminder(subscription);
        this.logger.log(`Đã schedule renewal reminder cho subscription ${subscription.id} sau payment`);
      }
    } catch (error) {
      this.logger.error(`Lỗi khi schedule renewal reminder cho subscription ${subscription.id}: ${error.message}`);
      throw error;
    }
  }
  //#endregion scheduleRenewalReminderForSubscription

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

  private async getUserEmail(userId: string): Promise<string> {
    const user = await this.userService.findOne(userId);
    return user.email;
  }

  private async getUserName(userId: string): Promise<string> {
    const user = await this.userService.findOne(userId);
    return user.fullName || user.email;
  }

  //#region getPaymentById
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
  //#endregion getPaymentById

  //#region getInvoicePayments
  async getInvoicePayments(invoiceId: string) {
    const payments = await this.subscriptionPaymentRepository.find({
      where: { subscriptionInvoiceId: invoiceId },
      order: { createdAt: 'DESC' }
    });

    return payments;
  }
  //#endregion getInvoicePayments


} 