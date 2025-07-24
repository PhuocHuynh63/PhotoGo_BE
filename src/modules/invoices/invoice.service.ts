import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { FindAllInvoicesDto } from './dto/find-all.dto';
import { ServicePackageService } from '../service-package/service-package.service';
import { VoucherService } from '../vouchers/voucher.service';
import { InvoiceStatus } from '../../constants/payment.enum';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { VoucherStatusEnum, VoucherUserStatusEnum, VoucherTypeDiscount } from '../../constants/voucher.enum';
import { BookingStatus, BookingDepositType } from '../../constants/booking.enum';
import { Booking } from '../bookings/entities/booking.entity';
import { FilterInvoiceByUserIdDto, PaginationInvoiceDto } from './dto/filter-invoice.dto';
import { InvoiceSortField, SortDirection } from 'src/constants/invoice.enum';
import { VoucherUser } from '../vouchers/entities/voucher-user.entity';
import { Commission } from '../commission/entities/commission.entity';
import { SubscriptionService } from '../subscription/subscription.service';
import { BookingService } from '../bookings/booking.service';
import { SubscriptionStatus } from '../../constants/subscription.enum';
import { Inject, forwardRef } from '@nestjs/common';
import { ReviewService } from '../reviews/reviews.service';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private servicePackageService: ServicePackageService,
    private voucherService: VoucherService,
    @InjectRepository(VoucherUser)
    private readonly voucherUserRepository: Repository<VoucherUser>,
    @InjectRepository(Commission)
    private readonly commissionRepository: Repository<Commission>,
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => BookingService))
    private readonly bookingService: BookingService, // Inject BookingService
    private readonly reviewService: ReviewService, // Inject ReviewService
  ) { }

  async create(bookingId: string, voucherId: string | undefined, createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
    if (!bookingId) {
      throw new BadRequestException('ID đơn hàng không được để trống');
    }

    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['user', 'location', 'serviceConcept', 'serviceConcept.servicePackage'],
    });

    if (!booking) {
      throw new NotFoundException(`Đơn hàng với ID ${bookingId} không tồn tại`);
    }

    const existingInvoice = await this.invoiceRepository.findOne({
      where: { bookingId },
    });

    if (existingInvoice) {
      throw new ConflictException('Đơn hàng này đã có hóa đơn');
    }

    // ======================== LOGIC TÍNH TOÁN ĐỒNG BỘ ========================

    // --- BƯỚC 1: TÍNH GIÁ GỐC VÀ GIÁ CUỐI CÙNG CHO KHÁCH HÀNG (chưa gồm phí, chưa giảm giá) ---
    let originPrice = Number(booking.serviceConcept.price); // Giá gốc từ DB
    const COMMISSION_RATE = 0.30; // 30%
    const TAX_RATE = 0.05; // 5%
    const TOTAL_MULTIPLIER = 1 + COMMISSION_RATE + TAX_RATE; // 1.35

    // estimatedPrice là giá dịch vụ cuối cùng mà khách hàng thấy (đã gồm hoa hồng, thuế)
    let estimatedPrice = Math.round(originPrice * TOTAL_MULTIPLIER);
    const taxAmount = Math.round(originPrice * TAX_RATE); // Giữ lại để lưu vào DB

    // --- BƯỚC 2: TÍNH RUSH FEE trên estimatedPrice ---
    const bookingDate = booking.date ? new Date(booking.date) : null;
    const rushFee = await this.bookingService.calculateRushFee(booking.userId, bookingDate, estimatedPrice);

    // --- BƯỚC 3: TÍNH GIẢM GIÁ SUBSCRIPTION TRÊN estimatedPrice ---
    let discountSubscription = 0;
    const userId = booking.userId;
    if (userId) {
      const activeSubscription = await this.subscriptionService['subscriptionRepository'].findOne({
        where: { userId, status: SubscriptionStatus.ACTIVE },
      });
      if (activeSubscription) {
        discountSubscription = Math.round(estimatedPrice * 0.1);
      }
    }
    const priceAfterSub = estimatedPrice - discountSubscription;

    // --- BƯỚC 4: TÍNH DISCOUNT (VOUCHER) TRÊN GIÁ ĐÃ TRỪ SUBSCRIPTION ---
    let discountAmount = 0;
    let voucher = null;
    if (voucherId) {
      voucher = await this.voucherService.findOneVoucher(voucherId);
      if (!voucher) {
        throw new NotFoundException(`Voucher với ID ${voucherId} không tồn tại`);
      }

      let voucherUser = await this.voucherUserRepository.findOne({
        where: { user_id: booking.userId, voucher_id: voucherId, status: VoucherUserStatusEnum.AVAILABLE },
      });
      let campaignVoucher = null;
      if (!voucherUser) {
        campaignVoucher = await this.voucherService.findCampaignVoucherByVoucherId(voucher.id);
      }
      if (!voucherUser && !campaignVoucher) {
        throw new BadRequestException('Bạn không có quyền sử dụng voucher này hoặc voucher đã được sử dụng');
      }

      const now = new Date();
      const startDate = new Date(voucher.startDate);
      const endDate = new Date(voucher.endDate);
      if (now < startDate || now > endDate || voucher.status !== VoucherStatusEnum.ACTIVE) {
        throw new BadRequestException(`Voucher với ID ${voucherId} không còn hiệu lực`);
      }

      if (priceAfterSub < voucher.minPrice) {
        throw new BadRequestException(`Giá trị đơn hàng phải từ ${voucher.minPrice.toLocaleString('vi-VN')} VNĐ để sử dụng voucher này`);
      }

      // Tính toán chiết khấu trên priceAfterSub (sau subscription)
      if (voucher.discount_type === VoucherTypeDiscount.PERCENTAGE) {
        discountAmount = priceAfterSub * (Number(voucher.discount_value) / 100);
      } else if (voucher.discount_type === VoucherTypeDiscount.FIXED) {
        discountAmount = Number(voucher.discount_value);
      }
      if (discountAmount > voucher.maxPrice) {
        discountAmount = voucher.maxPrice;
      }
    }

    // --- BƯỚC 5: TÍNH FINAL PRICE, GIÁ SAU KHI GIẢM GIÁ, CỌC, CÒN LẠI ---
    let finalPrice = priceAfterSub + rushFee;
    let priceAfterDiscount = finalPrice - discountAmount;
    if (priceAfterDiscount < 0) {
      discountAmount = finalPrice;
      priceAfterDiscount = 0;
    }
    let depositAmount = 0;
    if (booking.depositType === BookingDepositType.PERCENTAGE) {
      if (booking.depositAmount < 30) {
        throw new BadRequestException('Tỷ lệ đặt cọc phải tối thiểu 30%');
      }
      depositAmount = Math.round(priceAfterDiscount * (booking.depositAmount / 100));
    } else { // FIXED
      depositAmount = Math.round(booking.depositAmount || 0);
    }
    const remainingAmount = priceAfterDiscount - depositAmount;
    let payablePrice = depositAmount;

    // --- BƯỚC 6: TẠO HÓA ĐƠN VỚI CÁC GIÁ TRỊ ĐÃ ĐỒNG BỘ ---
    const invoice = this.invoiceRepository.create({
      ...createInvoiceDto,
      bookingId: booking.id,
      voucherId: voucher?.id || null,
      originalPrice: estimatedPrice,          // Giá dịch vụ cuối cùng (đã gồm hoa hồng, thuế)
      discountAmount: Math.round(discountAmount + discountSubscription),       // Số tiền được giảm (gồm cả voucher và subscription)
      discountedPrice: Math.round(priceAfterDiscount),  // Giá dịch vụ sau khi giảm giá voucher (đã trừ subscription)
      taxAmount: taxAmount,               // Tiền thuế
      feeAmount: Math.round(rushFee),                 // Phí phát sinh (rush fee)
      payablePrice: Math.round(payablePrice),           // Tổng tiền phải trả ngay (chỉ cọc)
      depositAmount: Math.round(depositAmount),         // Tiền cọc cho dịch vụ
      remainingAmount: Math.round(remainingAmount),     // Tiền dịch vụ còn lại phải trả sau
      paidAmount: 0,
      status: InvoiceStatus.PENDING,
      // discountSubscription: discountSubscription // Nếu muốn lưu riêng
    });

    return this.invoiceRepository.save(invoice);
  }

  async findAll(paginationDto: PaginationInvoiceDto): Promise<{
    data: Invoice[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const { current = 1, pageSize = 10, sortBy = InvoiceSortField.ISSUED_AT, sortDirection = SortDirection.DESC } = paginationDto;
    const currentPage = Number(current);
    const pageSizeNum = Number(pageSize);
    const skip = (currentPage - 1) * pageSizeNum;

    const [invoices, total] = await this.invoiceRepository.findAndCount({
      relations: ['booking', 'booking.serviceConcept', 'booking.serviceConcept.servicePackage'],
      skip,
      take: pageSizeNum,
      order: {
        [sortBy]: sortDirection
      }
    });
    const totalPages = Math.ceil(total / pageSizeNum);

    // Apply pricing logic to each invoice
    const processedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        return invoice;
      })
    );

    return {
      data: processedInvoices,
      pagination: {
        current: currentPage,
        pageSize: pageSizeNum,
        totalPage: totalPages,
        totalItem: total
      }
    };
  }

  async findAllByUserId(userId: string, paginationDto: FilterInvoiceByUserIdDto): Promise<{
    data: Invoice[] & { isReview: boolean }[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const { current = 1, pageSize = 10, sortBy = InvoiceSortField.ISSUED_AT, sortDirection = SortDirection.DESC, status, term } = paginationDto;
    const currentPage = Number(current);
    const pageSizeNum = Number(pageSize);
    const skip = (currentPage - 1) * pageSizeNum;

    // Use query builder for complex filtering
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.booking', 'booking')
      .leftJoinAndSelect('invoice.payments', 'payments')
      .leftJoinAndSelect('booking.serviceConcept', 'serviceConcept')
      .leftJoinAndSelect('serviceConcept.servicePackage', 'servicePackage')
      .where('booking.userId = :userId', { userId });

    // Add booking status filter if provided
    if (status) {
      queryBuilder.andWhere('booking.status = :status', { status });
    }

    // Add term filter for service concept name if provided
    if (term) {
      queryBuilder.andWhere('LOWER(serviceConcept.name) LIKE LOWER(:term)', { term: `%${term}%` });
    }

    // Add ordering
    queryBuilder.orderBy(`invoice.${sortBy}`, sortDirection.toUpperCase() as 'ASC' | 'DESC');

    // Get total count for pagination
    const total = await queryBuilder.getCount();

    // Add pagination
    queryBuilder.skip(skip).take(pageSizeNum);

    // Execute query
    const invoices = await queryBuilder.getMany();
    const totalPages = Math.ceil(total / pageSizeNum);

    // Apply pricing logic to each invoice
    const processedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        const hasReview = await this.reviewService.hasReviewForBooking(invoice.bookingId);
        return {
          ...invoice,
          vendorId: invoice.booking?.serviceConcept?.servicePackage?.vendor?.id,
          isReview: !hasReview, // isReview = false if has review, true otherwise
        };
      })
    );

    return {
      data: processedInvoices,
      pagination: {
        current: currentPage,
        pageSize: pageSizeNum,
        totalPage: totalPages,
        totalItem: total
      }
    };
  }

  async findOne(id: string): Promise<Invoice & { isReview: boolean }> {
    if (!id) {
      throw new BadRequestException('ID hóa đơn không được để trống');
    }

    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['booking', 'payments', 'booking.serviceConcept', 'booking.location', 'booking.location.vendor', 'booking.serviceConcept.servicePackage'],
    });

    if (!invoice) {
      throw new NotFoundException(`Hóa đơn với ID ${id} không tồn tại`);
    }
    const hasReview = await this.reviewService.hasReviewForBooking(invoice.bookingId);
    return {
      ...invoice,
      isReview: !hasReview, // isReview = false if has review, true otherwise
    };
  }

  async updateInvoice(id: string, updateInvoiceDto: Partial<UpdateInvoiceDto>): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new ConflictException('Không thể cập nhật hóa đơn đã thanh toán');
    }

    if (updateInvoiceDto.status) {
      if (!Object.values(InvoiceStatus).includes(updateInvoiceDto.status)) {
        throw new BadRequestException('Trạng thái hóa đơn không hợp lệ');
      }

      if (invoice.status === InvoiceStatus.PENDING && updateInvoiceDto.status === InvoiceStatus.PAID) {
        throw new BadRequestException('Không thể chuyển trực tiếp từ PENDING sang PAID');
      }
    }

    if (updateInvoiceDto.paidAmount !== undefined) {
      invoice.paidAmount = updateInvoiceDto.paidAmount;
      if (invoice.paidAmount >= invoice.payablePrice) {
        invoice.status = InvoiceStatus.PAID;
        await this.bookingRepository.update(invoice.bookingId, {
          status: BookingStatus.COMPLETED,
        });
      }
    }

    Object.assign(invoice, updateInvoiceDto);
    return this.invoiceRepository.save(invoice);
  }

  async deleteInvoice(id: string): Promise<void> {
    const invoice = await this.findOne(id);

    if (invoice.status !== InvoiceStatus.PENDING) {
      throw new ConflictException('Chỉ có thể xóa hóa đơn ở trạng thái PENDING');
    }

    if (invoice.payments && invoice.payments.length > 0) {
      throw new ConflictException('Không thể xóa hóa đơn đã có thanh toán');
    }

    const result = await this.invoiceRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Hóa đơn với ID ${id} không tồn tại`);
    }
  }
}