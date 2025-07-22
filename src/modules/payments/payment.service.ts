import { Inject, Injectable, NotFoundException, BadRequestException, ConflictException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { InvoiceStatus, PaymentMethod, PaymentStatus, PaymentType } from '../../constants/payment.enum';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FindAllPaymentsDto } from './dto/find-all-payments.dto';
import { Invoice } from '../invoices/entities/invoice.entity';
import { ConfigService } from '@nestjs/config';
import { BookingDepositType, BookingStatus } from '../../constants/booking.enum';
import { VoucherService } from '../vouchers/voucher.service';
import { VoucherUserStatusEnum, VoucherStatusEnum } from '../../constants/voucher.enum';
import PayOS from '@payos/node';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { BookingHistory } from '../bookings/entities/booking-history.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { PaymentCallbackDto } from './dto/payment-callback.dto';
import { PaginationDto } from './dto/pagination.dto';
import { Point } from '../points/entities/point.entity';
import { PointTransaction } from '../points/entities/point-transaction.entity';
import { PointTransactionType } from '../../constants/point.enum';
import { MailService } from 'src/3rdService/mail/mail.service';
import { BookingService } from '../bookings/booking.service';
import { RefundService } from '../refunds/refund.service';
import { LocationAvailabilityService } from '../locations/location-availability.service';
import { Voucher } from '../vouchers/entities/voucher.entity';
import { LocationWorkingDate } from '../locations/entities/location-workingdate.entity';
import { Album } from '../album/entities/album.entity';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BookingHistory)
    private readonly bookingHistoryRepository: Repository<BookingHistory>,
    @Inject('PAYOS_CLIENT') private readonly payos: PayOS,
    private readonly configService: ConfigService,
    private readonly voucherService: VoucherService,
    @InjectRepository(Point)
    private readonly pointRepository: Repository<Point>,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepository: Repository<PointTransaction>,
    private readonly mailService: MailService,
    @Inject(forwardRef(() => BookingService))
    private readonly bookingService: BookingService,
    @Inject(forwardRef(() => RefundService))
    private readonly refundService: RefundService,
    private readonly locationAvailabilityService: LocationAvailabilityService,
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(LocationWorkingDate)
    private readonly locationWorkingDateRepository: Repository<LocationWorkingDate>,
    @InjectRepository(Album)
    private readonly albumRepository: Repository<Album>,
  ) { }

  // Helper function to format date to DD/MM/YYYY
  private formatDate(date: Date): string {
    if (!date) return null;
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  //#region create 

  // thêm bull vào để biết time gia hạn và thông báo cho người dùng khi hết hạn
  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    // Validate required fields
    if (!createPaymentDto.invoiceId) {
      throw new BadRequestException('ID hóa đơn không được để trống');
    }
    if (!createPaymentDto.amount || createPaymentDto.amount <= 0) {
      throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0');
    }
    if (!createPaymentDto.paymentMethod) {
      throw new BadRequestException('Phương thức thanh toán không được để trống');
    }
    if (!createPaymentDto.type) {
      throw new BadRequestException('Loại thanh toán không được để trống');
    }

    // Check if invoice exists
    const invoice = await this.invoiceRepo.findOne({
      where: { id: createPaymentDto.invoiceId }
    });
    if (!invoice) {
      throw new NotFoundException(`Không tìm thấy hóa đơn với ID ${createPaymentDto.invoiceId}`);
    }

    // Check if payment amount is valid
    if (createPaymentDto.type === PaymentType.DEPOSIT && createPaymentDto.amount > invoice.payablePrice) { // payable price = depositAmount + rushFee
      throw new BadRequestException('Số tiền đặt cọc không được vượt quá số tiền cần đặt cọc');
    }
    if (createPaymentDto.type === PaymentType.REMAINING && createPaymentDto.amount > invoice.remainingAmount) {
      throw new BadRequestException('Số tiền thanh toán không được vượt quá số tiền còn lại');
    }

    // Check if payment already exists for this invoice and type
    const existingPayment = await this.paymentRepository.findOne({
      where: {
        invoiceId: createPaymentDto.invoiceId,
        type: createPaymentDto.type,
        status: PaymentStatus.PAID
      }
    });
    if (existingPayment) {
      throw new ConflictException(`Đã tồn tại thanh toán ${createPaymentDto.type} cho hóa đơn này`);
    }

    const payment = this.paymentRepository.create(createPaymentDto);
    return await this.paymentRepository.save(payment);
  }

  //#endregion create 

  async findAll(paginationDto: PaginationDto): Promise<{
    data: Payment[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const { current = 1, pageSize = 10, sortBy = 'createdAt', sortDirection = 'DESC' } = paginationDto;
    const skip = (current - 1) * pageSize;
    const qb = this.paymentRepository.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.invoice', 'invoice')
      .leftJoinAndSelect('invoice.booking', 'booking')
      .leftJoinAndSelect('booking.user', 'user');

    qb.orderBy(`payment.${sortBy}`, sortDirection as 'DESC' | 'ASC')
      .skip(skip)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      pagination: {
        current,
        pageSize,
        totalPage: Math.ceil(total / pageSize),
        totalItem: total
      }
    };
  }

  async findOne(id: string): Promise<Payment> {
    if (!id) {
      throw new BadRequestException('ID thanh toán không được để trống');
    }

    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['invoice', 'invoice.booking', 'invoice.booking.user'],
    });

    if (!payment) {
      throw new NotFoundException(`Không tìm thấy thanh toán với ID ${id}`);
    }

    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.findOne(id);

    // Check if payment is already completed
    if (payment.status === PaymentStatus.PAID) {
      throw new ConflictException('Không thể cập nhật thanh toán đã hoàn thành');
    }

    // Validate status transition
    if (updatePaymentDto.status) {
      if (!Object.values(PaymentStatus).includes(updatePaymentDto.status)) {
        throw new BadRequestException('Trạng thái thanh toán không hợp lệ');
      }

      // Check if status transition is valid
      if (payment.status === PaymentStatus.PENDING && updatePaymentDto.status === PaymentStatus.PAID) {
        // Update invoice paid amount
        const invoice = await this.invoiceRepo.findOne({
          where: { id: payment.invoiceId }
        });
        if (!invoice) {
          throw new NotFoundException(`Không tìm thấy hóa đơn với ID ${payment.invoiceId}`);
        }

        const paymentAmount = Math.round(Number(payment.amount));
        invoice.paidAmount += paymentAmount;
        await this.invoiceRepo.save(invoice);

        Object.assign(payment, updatePaymentDto);
        return await this.paymentRepository.save(payment);
      }
    }

    Object.assign(payment, updatePaymentDto);
    return await this.paymentRepository.save(payment);
  }

  async remove(id: string): Promise<void> {
    const payment = await this.findOne(id);

    // Check if payment is already completed
    if (payment.status === PaymentStatus.PAID) {
      throw new ConflictException('Không thể xóa thanh toán đã hoàn thành');
    }

    await this.paymentRepository.remove(payment);
  }

  async createPayOSLink(invoiceId: string, paymentType: PaymentType) {
    if (!invoiceId) {
      throw new BadRequestException('ID hóa đơn không được để trống');
    }

    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
      relations: ['booking', 'booking.user', 'booking.serviceConcept'],
    });

    if (!invoice) {
      throw new NotFoundException(`Không tìm thấy hóa đơn với ID ${invoiceId}`);
    }

    // --- KIỂM TRA QUAN TRỌNG ---
    // 1. Không cho tạo link thanh toán nếu hóa đơn đã hoàn tất hoặc đã bị hủy.
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
      throw new ConflictException(`Hóa đơn này đã được thanh toán đầy đủ hoặc đã bị hủy.`);
    }

    // 2. Kiểm tra xem khoản thanh toán cụ thể này đã được trả chưa.
    const existingPayment = await this.paymentRepository.findOne({
      where: {
        invoiceId,
        type: paymentType,
        status: PaymentStatus.PAID
      }
    });
    if (existingPayment) {
      throw new ConflictException(`Khoản thanh toán (${paymentType}) cho hóa đơn này đã được hoàn tất.`);
    }

    // 3. (LOGIC HIỆN TẠI - RẤT TỐT) Kiểm tra slot trước khi cho thanh toán cọc.
    if (paymentType === PaymentType.DEPOSIT) {
      // Giả sử isSlotStillAvailable là một phương thức private hoặc protected, truy cập qua this
      const isSlotAvailable = await this.bookingService['isSlotStillAvailable'](invoice.booking.id);
      if (!isSlotAvailable) {
        // Cập nhật trạng thái booking và invoice thành CANCELLED để người dùng không thử lại
        await this.bookingRepository.update(invoice.booking.id, { status: BookingStatus.CANCELLED });
        await this.invoiceRepo.update(invoice.id, { status: InvoiceStatus.CANCELLED });
        throw new BadRequestException('Slot thời gian không còn khả dụng và đơn hàng của bạn đã bị hủy. Vui lòng đặt lại.');
      }
    }

    // --- XÁC ĐỊNH SỐ TIỀN VÀ MÔ TẢ THANH TOÁN ---
    let amount = 0;
    let description = '';

    if (paymentType === PaymentType.DEPOSIT) {
      // Lần thanh toán đầu tiên bao gồm tiền cọc (depositAmount) và phí phát sinh (feeAmount/rushFee).
      amount = invoice.payablePrice;
      description = `Thanh toan coc cho don hang #${invoice.booking.id}`;
    } else { // Giả sử là thanh toán phần còn lại (REMAINING)
      // Lần thanh toán thứ hai là số tiền dịch vụ còn lại.
      amount = invoice.remainingAmount;
      description = `Thanh toan phan con lai cho don hang #${invoice.booking.id}`;
    }

    if (amount <= 0) {
      // Trường hợp này có thể xảy ra nếu voucher 100% và không có phí gấp.
      // Cần xử lý nghiệp vụ ở đây, ví dụ: tự động cập nhật trạng thái PAID.
      // Tạm thời ném lỗi để tránh tạo link 0 đồng.
      throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0. Không thể tạo liên kết thanh toán.');
    }

    // --- CHUẨN BỊ DỮ LIỆU CHO PAYOS ---
    const orderCode = parseInt(`${Date.now()}`); // PayOS yêu cầu orderCode là number. Dùng timestamp là đủ unique.
    const buyerName = invoice.booking?.user?.fullName || 'Khách hàng PhotoGo';
    const expiredAt = Math.floor(Date.now() / 1000) + 15 * 60; // Hết hạn sau 15 phút

    const paymentLinkData = {
      orderCode,
      amount,
      description,
      buyerName,
      items: [{
        name: invoice.booking?.serviceConcept?.name || 'Dịch vụ PhotoGo',
        quantity: 1,
        price: amount,
      }],
      cancelUrl: `https://photogo.id.vn/payment/cancel?invoiceId=${invoice.id}`,
      returnUrl: `https://photogo.id.vn/payment/success?invoiceId=${invoice.id}`,
      expiredAt,
    };

    try {
      const paymentLinkRes = await this.payos.createPaymentLink(paymentLinkData);

      // Tạo hoặc cập nhật bản ghi thanh toán trong DB
      // Tốt hơn là tìm một bản ghi PENDING cũ (nếu có) và cập nhật nó
      // để tránh tạo ra nhiều bản ghi PENDING cho cùng một lần thanh toán.
      await this.paymentRepository.upsert({
        invoiceId: invoice.id,
        amount,
        paymentMethod: PaymentMethod.PAYOS,
        status: PaymentStatus.PENDING,
        transactionId: orderCode.toString(),
        type: paymentType,
        description,
        paymentOSId: paymentLinkRes.paymentLinkId,
      }, ['invoiceId', 'type']); // `upsert` dựa trên invoiceId và type

      return {
        checkoutUrl: paymentLinkRes.checkoutUrl,
        paymentLinkId: paymentLinkRes.paymentLinkId,
      };
    } catch (error) {
      console.error('PayOS error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Đã có lỗi xảy ra khi tạo liên kết thanh toán.';
      throw new BadRequestException(errorMessage);
    }
  }

  async handlePayOSWebhook(data: any) {
    if (!data || !data.transactionId) {
      throw new BadRequestException('Dữ liệu webhook không hợp lệ');
    }

    const { status, transactionId } = data;

    // Find payment based on transactionId
    const payment = await this.paymentRepository.findOne({
      where: { transactionId },
      relations: [
        'invoice',
        'invoice.booking',
        'invoice.booking.user',
        'invoice.booking.user.voucherUsers',
        'invoice.booking.user.voucherUsers.voucher',
        'invoice.booking.histories',
        'invoice.booking.schedules' // Add schedules relation
      ]
    });

    if (!payment) {
      throw new NotFoundException(`Không tìm thấy thanh toán với ID ${transactionId}`);
    }

    const invoice = payment.invoice;
    const booking = invoice.booking;

    if (status === 'COMPLETED') {
      // Check if slot is still available before processing payment
      const isSlotAvailable = await this.locationAvailabilityService.isSlotAvailableForBooking(
        this.formatDate(booking.date),
        booking.time,
        booking.locationId
      );
      if (!isSlotAvailable) {
        // Slot is no longer available, reject payment and create refund record
        payment.status = PaymentStatus.REFUND_PENDING;
        await this.paymentRepository.save(payment);

        // Create refund record for manual processing
        try {
          await this.refundService.createConflictRefund(payment.id, {
            bankCode: data.bankCode,
            accountNumber: data.accountNumber,
            accountName: data.accountName,
            transferId: data.transferId,
            transferTime: data.transferTime,
            paymentMethod: data.paymentMethod,
          });
        } catch (refundError) {
          console.error('Error creating refund record:', refundError);
        }

        // Send notification to user about slot unavailability and pending refund
        if (booking.email) {
          await this.mailService.sendBookingCancellationEmail(
            booking.email,
            booking.fullName,
            booking.code,
            booking.date,
            booking.time,
            'Slot thời gian đã được đặt bởi người khác. Tiền sẽ được hoàn lại trong 1-3 ngày làm việc.'
          );
        }

        return {
          success: false,
          message: 'Slot thời gian không còn khả dụng. Tiền sẽ được hoàn lại.'
        };
      }

      // Update payment status
      payment.status = PaymentStatus.PAID;
      await this.paymentRepository.save(payment);

      // Update invoice status and paid amount
      const paymentAmount = Math.round(Number(payment.amount));
      invoice.paidAmount += paymentAmount;
      if (payment.type === PaymentType.DEPOSIT) {
        invoice.status = InvoiceStatus.PARTIALLY_PAID;
      } else if (payment.type === PaymentType.REMAINING) {
        invoice.status = InvoiceStatus.PAID;
      }
      await this.invoiceRepo.save(invoice);

      // Update booking status using helper method
      await this.updateBookingStatus(booking, payment.type);

      // Handle payment priority - cancel overlapping bookings
      if (payment.type === PaymentType.DEPOSIT) {
        await this.bookingService['handlePaymentPriority'](booking.id);
      }

      // NEW: Handle multi-day booking - close all scheduled dates when payment is successful
      if (payment.type === PaymentType.DEPOSIT && booking.schedules && booking.schedules.length > 0) {
        try {
          await this.closeAllScheduledDates(booking.schedules, booking.locationId);
        } catch (error) {
          console.error('Error closing scheduled dates after successful payment:', error);
        }
      }

      // Block the slot since payment is successful (for single day booking)
      if (payment.type === PaymentType.DEPOSIT && !booking.schedules) {
        try {
          await this.locationAvailabilityService.lockSlotForBooking(
            this.formatDate(booking.date),
            booking.time,
            booking.locationId
          );
        } catch (error) {
          console.error('Error locking slot after successful payment:', error);
        }
      }

      // Handle voucher if exists
      if (invoice.voucherId) {
        try {
          await this.voucherService.updateVoucherUsage(invoice.voucherId);
        } catch (error) {
          console.error('Error updating voucher usage:', error);
        }
      }

      // Calculate and update priority score for the booking
      try {
        await this.bookingService.updatePriorityScore(booking.id);
      } catch (error) {
        console.error('Error updating priority score:', error);
      }

      return {
        success: true,
        message: 'Thanh toán thành công'
      };
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepository.save(payment);

      // NEW: Reopen scheduled dates for multi-day booking if payment failed
      if (booking.schedules && booking.schedules.length > 0) {
        try {
          await this.reopenAllScheduledDates(booking.schedules, booking.locationId);
        } catch (error) {
          console.error('Error reopening scheduled dates after payment failure:', error);
        }
      } else {
        // Unlock slot for single day booking
        await this.locationAvailabilityService.unlockSlot(
          this.formatDate(booking.date),
          booking.time,
          booking.locationId
        );
      }

      return {
        success: false,
        message: status === 'FAILED' ? 'Thanh toán thất bại' : 'Đơn hàng đã bị huỷ'
      };
    } else {
      throw new BadRequestException(`Trạng thái thanh toán không hợp lệ: ${status}`);
    }
  }

  async handlePaymentSuccess(paymentId: string, callbackData: PaymentCallbackDto) {
    const { status, code, id, orderCode } = callbackData;

    // Find payment based on transactionId (orderCode)
    const payment = await this.paymentRepository.findOne({
      where: { transactionId: paymentId },
      relations: [
        'invoice',
        'invoice.booking',
        'invoice.booking.user',
        'invoice.booking.user.voucherUsers',
        'invoice.booking.user.voucherUsers.voucher',
        'invoice.booking.histories',
        'invoice.booking.location',
        'invoice.booking.location.vendor',
        'invoice.booking.serviceConcept',
        'invoice.booking.serviceConcept.servicePackage',
        'invoice.booking.schedules', // Add schedules relation
      ]
    });

    if (!payment) {
      throw new NotFoundException(`Không tìm thấy thanh toán với ID ${paymentId}`);
    }

    const invoice = payment.invoice;
    const booking = invoice.booking;

    // Check if slot is still available before processing payment
    const isSlotAvailable = await this.bookingService['isSlotStillAvailable'](booking.id);
    if (!isSlotAvailable) {
      // Slot is no longer available, reject payment
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepository.save(payment);

      // Send notification to user about slot unavailability
      if (booking.email) {
        await this.mailService.sendBookingCancellationEmail(
          booking.email,
          booking.fullName,
          booking.code,
          booking.date,
          booking.time,
          'Slot thời gian đã được đặt bởi người khác trước khi bạn thanh toán'
        );
      }

      return {
        success: false,
        message: 'Slot thời gian không còn khả dụng'
      };
    }

    // Update payment status
    payment.status = PaymentStatus.PAID;
    await this.paymentRepository.save(payment);

    // Update invoice status and paid amount
    const paymentAmount = Math.round(Number(payment.amount));
    invoice.paidAmount += paymentAmount;
    if (payment.type === PaymentType.DEPOSIT) {
      // Nếu thanh toán đặt cọc 100% thì status là PAID, còn lại là PARTIALLY_PAID
      if (paymentAmount == 100) {
        invoice.status = InvoiceStatus.PAID;
      } else {
        invoice.status = InvoiceStatus.PARTIALLY_PAID;
      }
    } else if (payment.type === PaymentType.REMAINING) {
      invoice.status = InvoiceStatus.PAID;
    }
    await this.invoiceRepo.save(invoice);

    // Update booking status using helper method
    await this.updateBookingStatus(booking, payment.type);

    // Handle payment priority - cancel overlapping bookings
    if (payment.type === PaymentType.DEPOSIT) {
      await this.bookingService['handlePaymentPriority'](booking.id);
    }

    // NEW: Handle multi-day booking - close all scheduled dates when payment is successful
    if (payment.type === PaymentType.DEPOSIT && booking.schedules && booking.schedules.length > 0) {
      try {
        await this.closeAllScheduledDates(booking.schedules, booking.locationId);
      } catch (error) {
        console.error('Error closing scheduled dates after successful payment:', error);
      }
    }

    // handle point
    let points = booking?.user?.points;
    const userId = booking?.user?.id;
    const userMultiplier = typeof booking?.user?.multiplier === 'number' ? Number(booking.user.multiplier) : 1.0;
    // Nếu chưa có point record cho user thì tạo mới
    if ((!points || points.length === 0) && userId) {
      const newPoint = this.pointRepository.create({ user: booking.user, balance: 0 });
      await this.pointRepository.save(newPoint);
      points = [newPoint];
    }
    if (points && invoice && typeof invoice.payablePrice === 'number' && typeof payment.amount === 'number') {
      // Tính phần trăm đặt cọc
      const depositPercent = booking.depositAmount;
      points.forEach(async (point) => {
        let earnedPoint = payment.amount / 1000000;
        // Nếu là đặt cọc dạng phần trăm và từ 30 đến <70% thì trừ 5 điểm
        if (
          booking.depositType === BookingDepositType.PERCENTAGE &&
          depositPercent >= 30 && depositPercent < 70
        ) {
          earnedPoint -= 5;
        }
        // Áp dụng multiplier nếu có
        earnedPoint = earnedPoint * userMultiplier;
        // Nếu >= 70% hoặc không phải dạng phần trăm thì nhận full điểm
        point.balance += Math.round(earnedPoint);
        await this.pointRepository.save(point);
        const pointTransaction = this.pointTransactionRepository.create({
          point: point,
          amount: Math.round(earnedPoint),
          type: PointTransactionType.EARN,
          description: `Thanh toán đặt cọc`,
        });
        await this.pointTransactionRepository.save(pointTransaction);
      });
    }

    // Send invoice to user's email if payment handled successfully
    if (invoice.booking?.email) {
      // Format issuedAt to VN time (Asia/Ho_Chi_Minh)
      const issuedAtVN = new Date(invoice.issuedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      await this.mailService.sendMail(
        invoice.booking?.email,
        'Hóa đơn thanh toán của bạn',
        'invoice', // template name
        { invoice: { ...invoice, issuedAt: issuedAtVN } }
      );
    }

    // Handle voucher if exists
    // Since voucher validation is already done during booking creation, 
    // we can now read the voucherId directly from the invoice
    if (invoice.voucherId) {
      try {
        await this.voucherService.updateVoucherUsage(invoice.voucherId);
      } catch (error) {
        console.error('Error updating voucher usage:', error);
      }
    }

    const voucher = await this.voucherRepository.findOne({
      where: { id: invoice.voucherId },
    });
    if (voucher) {
      await this.voucherService.useVoucher(voucher.id, booking.userId);
    }

    // Block the slot since payment is successful (for single day booking)
    if (payment.type === PaymentType.DEPOSIT && !booking.schedules) {
      try {
        await this.locationAvailabilityService.lockSlotForBooking(
          this.formatDate(booking.date),
          booking.time,
          booking.locationId
        );
      } catch (error) {
        console.error('Error locking slot after successful payment:', error);
      }
    }

    return {
      success: true,
      message: 'Thanh toán thành công'
    };
  }

  async handlePaymentError(paymentId: string, callbackData: PaymentCallbackDto) {
    const { status, code, id, orderCode } = callbackData;

    // Find payment based on transactionId (orderCode)
    const payment = await this.paymentRepository.findOne({
      where: { transactionId: paymentId },
      relations: [
        'invoice',
        'invoice.booking',
        'invoice.booking.histories',
        'invoice.booking.schedules' // Add schedules relation
      ]
    });

    if (!payment) {
      throw new NotFoundException(`Không tìm thấy thanh toán với ID ${paymentId}`);
    }

    // Update payment status to failed
    payment.status = PaymentStatus.FAILED;
    await this.paymentRepository.save(payment);

    const booking = payment.invoice?.booking;

    // NEW: Reopen scheduled dates for multi-day booking if payment failed
    if (booking && booking.schedules && booking.schedules.length > 0) {
      try {
        await this.reopenAllScheduledDates(booking.schedules, booking.locationId);
      } catch (error) {
        console.error('Error reopening scheduled dates after payment failure:', error);
      }
    } else if (booking) {
      // Single day booking: unlock slot nếu có booking
      await this.locationAvailabilityService.unlockSlot(
        this.formatDate(booking.date),
        booking.time,
        booking.locationId
      );

      // Delete album if booking is timeout, cancelled or failed
      const album = await this.albumRepository.findOne({
        where: { bookingId: booking.id },
      });
      if (album) {
        await this.albumRepository.delete(album.id);
      }
    }

    // Update invoice status (nếu muốn)
    const invoice = payment.invoice;
    if (invoice) {
      invoice.status = InvoiceStatus.CANCELLED;
      await this.invoiceRepo.save(invoice);
    }

    // Update booking status - chỉ hủy nếu booking đang ở trạng thái NOT_PAID
    if (booking && booking.status === BookingStatus.NOT_PAID) {
      booking.status = BookingStatus.CANCELLED_USER;
      await this.bookingRepository.save(booking);

      // Create booking history
      const history = this.bookingHistoryRepository.create({
        bookingId: booking.id,
        status: BookingStatus.CANCELLED_USER,
      });
      await this.bookingHistoryRepository.save(history);
    }
  }

  async findOneByTransactionId(transactionId: string): Promise<string> {
    const payment = await this.paymentRepository.findOne({
      where: { transactionId },
      relations: ['invoice', 'invoice.booking'],
    });

    if (!payment) {
      throw new NotFoundException(`Không tìm thấy thanh toán với transaction ID ${transactionId}`);
    }

    return payment.invoice.booking.id;
  }

  async checkSlotAvailability(invoiceId: string): Promise<boolean> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
      relations: ['booking'],
    });

    if (!invoice) {
      throw new NotFoundException(`Không tìm thấy hóa đơn với ID ${invoiceId}`);
    }

    if (!invoice.booking) {
      throw new NotFoundException('Hóa đơn không liên kết với booking');
    }

    return await this.bookingService['isSlotStillAvailable'](invoice.booking.id);
  }

  async deleteAllByInvoiceId(invoiceId: string): Promise<void> {
    await this.paymentRepository.delete({ invoiceId });
  }

  // NEW: Method to close all scheduled dates for multi-day booking
  private async closeAllScheduledDates(schedules: any[], locationId: string): Promise<void> {
    try {
      for (const schedule of schedules) {
        if (schedule.date) {
          // Convert date format from DD/MM/YYYY to YYYY-MM-DD
          const [day, month, year] = schedule.date.split('/');
          const convertedDate = `${year}-${month}-${day}`;

          // Find and close the working date
          const workingDate = await this.locationWorkingDateRepository.findOne({
            where: {
              date: new Date(convertedDate),
              locationAvailability: {
                location: { id: locationId }
              }
            },
            relations: ['locationAvailability', 'locationAvailability.location']
          });

          if (workingDate) {
            workingDate.isAvailable = false;
            await this.locationWorkingDateRepository.save(workingDate);
            console.log(`Closed date ${schedule.date} for location ${locationId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error closing scheduled dates:', error);
      throw error;
    }
  }

  // NEW: Method to reopen all scheduled dates for multi-day booking
  private async reopenAllScheduledDates(schedules: any[], locationId: string): Promise<void> {
    try {
      for (const schedule of schedules) {
        if (schedule.date) {
          // Convert date format from DD/MM/YYYY to YYYY-MM-DD
          const [day, month, year] = schedule.date.split('/');
          const convertedDate = `${year}-${month}-${day}`;

          // Find and reopen the working date
          const workingDate = await this.locationWorkingDateRepository.findOne({
            where: {
              date: new Date(convertedDate),
              locationAvailability: {
                location: { id: locationId }
              }
            },
            relations: ['locationAvailability', 'locationAvailability.location']
          });

          if (workingDate) {
            workingDate.isAvailable = true;
            await this.locationWorkingDateRepository.save(workingDate);
            console.log(`Reopened date ${schedule.date} for location ${locationId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error reopening scheduled dates:', error);
      throw error;
    }
  }

  //#region handleBookingStatusUpdate
  /**
   * Update booking status based on payment type and current status
   * @param booking Booking entity
   * @param paymentType Payment type (DEPOSIT or REMAINING)
   */
  private async updateBookingStatus(booking: Booking, paymentType: PaymentType): Promise<void> {
    if (paymentType === PaymentType.DEPOSIT) {
      // Thanh toán thành công - chuyển từ NOT_PAID sang PAID
      if (booking.status === BookingStatus.NOT_PAID) {
        booking.status = BookingStatus.PENDING;
        await this.bookingRepository.save(booking);
        // Create booking history
        const history = this.bookingHistoryRepository.create({
          booking: booking,
          status: BookingStatus.PENDING,
        });
        await this.bookingHistoryRepository.save(history);
      }
    }
  }
  //#endregion handleBookingStatusUpdate
}