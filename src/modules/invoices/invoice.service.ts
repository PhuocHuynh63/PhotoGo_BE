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
import { PaginationInvoiceDto } from './dto/filter-invoice.dto';
import { InvoiceSortField, SortDirection } from 'src/constants/invoice.enum';
import { VoucherUser } from '../vouchers/entities/voucher-user.entity';
import { Commission } from '../commission/entities/commission.entity';

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

    const serviceConcept = await this.servicePackageService.findServiceConcept(booking.serviceConceptId);
    if (!serviceConcept) {
      throw new NotFoundException(`Gói dịch vụ với ID ${booking.serviceConceptId} không tồn tại`);
    }

    const originalPrice = Math.round(serviceConcept.price);
    let discountAmount = 0;
    let voucher = null;
    if (voucherId) {
      voucher = await this.voucherService.findOneVoucher(voucherId);
      if (!voucher) {
        throw new NotFoundException(`Voucher với ID ${voucherId} không tồn tại`);
      }

      // 1. Check if voucher is from a campaign and user joined
      const isCampaignVoucher = await this.voucherService.isVoucherFromCampaignAndUserJoined(voucherId, booking.userId);
      // 2. Check if user has been assigned the voucher (voucher-user)
      const voucherUser = await this.voucherUserRepository.findOne({
        where: { user_id: booking.userId, voucher_id: voucherId },
      });
      const isAssignedVoucher = voucherUser && voucherUser.status === VoucherUserStatusEnum.AVAILABLE;

      // If neither condition is satisfied, throw error
      if (!isCampaignVoucher && !isAssignedVoucher) {
        throw new BadRequestException('Bạn không có quyền sử dụng voucher này (không thuộc campaign đã tham gia hoặc chưa được assign voucher)');
      }

      const now = new Date();
      const startDate = new Date(voucher.startDate);
      const endDate = new Date(voucher.endDate);
      if (now < startDate || now > endDate || voucher.status !== VoucherStatusEnum.ACTIVE) {
        throw new BadRequestException(`Voucher với ID ${voucherId} không còn hiệu lực`);
      }

      if (originalPrice < voucher.minPrice) {
        throw new BadRequestException(`Giá trị đơn hàng phải từ ${voucher.minPrice} để sử dụng voucher này`);
      }

      // If assigned voucher, must check status
      if (isAssignedVoucher === false && voucherUser) {
        throw new BadRequestException(`Bạn đã sử dụng voucher này hoặc voucher không khả dụng`);
      }

      if (voucher.discount_type === VoucherTypeDiscount.PERCENTAGE) {
        const discountValue = parseFloat(voucher.discount_value);
        discountAmount = Math.round((originalPrice * discountValue) / 100);
        if (voucher.maxPrice && discountAmount > voucher.maxPrice) {
          discountAmount = voucher.maxPrice;
        }
      } else if (voucher.discount_type === VoucherTypeDiscount.FIXED) {
        discountAmount = Math.round(parseFloat(voucher.discount_value));
        if (voucher.maxPrice && discountAmount > voucher.maxPrice) {
          discountAmount = voucher.maxPrice;
        }
      }
    }

    let discountedPrice = originalPrice - discountAmount;
    const commission = await this.commissionRepository.findOne({
      where: { serviceConceptId: serviceConcept.id }
    });
    const taxAmount = (Math.round(originalPrice) - Math.round(commission.commissionAmount)) * 0.05;
    const feeAmount = 0;
    const payablePrice = discountedPrice + feeAmount;

    let depositAmount = 0;
    let remainingAmount = 0;
    if (booking.depositType === BookingDepositType.PERCENTAGE) {
      if (booking.depositAmount < 30) {
        throw new BadRequestException('Tỷ lệ đặt cọc phải tối thiểu 30%');
      }
      depositAmount = Math.round(payablePrice * (booking.depositAmount / 100));
      remainingAmount = payablePrice - depositAmount;
    } else {
      depositAmount = booking.depositAmount;
      remainingAmount = payablePrice - depositAmount;
    }

    if (depositAmount < 0 || remainingAmount < 0) {
      throw new BadRequestException('Số tiền đặt cọc và số tiền còn lại phải lớn hơn 0');
    }

    depositAmount = Math.round(depositAmount);
    remainingAmount = Math.round(remainingAmount);

    const invoice = this.invoiceRepository.create({
      ...createInvoiceDto,
      bookingId: booking.id,
      originalPrice,
      discountAmount,
      discountedPrice,
      taxAmount,
      feeAmount,
      payablePrice,
      depositAmount,
      remainingAmount,
      paidAmount: 0,
      status: InvoiceStatus.PENDING,
    });

    if (voucher) {
      await this.voucherService.useVoucher(voucher.id, booking.userId);
    }

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
      skip,
      take: pageSizeNum,
      order: {
        [sortBy]: sortDirection
      }
    });
    const totalPages = Math.ceil(total / pageSizeNum);

    return {
      data: invoices,
      pagination: {
        current: currentPage,
        pageSize: pageSizeNum,
        totalPage: totalPages,
        totalItem: total
      }
    };
  }

  async findAllByUserId(userId: string, paginationDto: PaginationInvoiceDto): Promise<{
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
      where: { booking: { userId } },
      relations: ['booking', 'payments'],
      skip,
      take: pageSizeNum,
      order: {
        [sortBy]: sortDirection
      }
    });
    const totalPages = Math.ceil(total / pageSizeNum);

    const serviceConceptCache = new Map<string, any>();
    const servicePackageCache = new Map<string, any>();

    for (const invoice of invoices) {
      let serviceConcept = serviceConceptCache.get(invoice.booking.serviceConceptId);
      if (!serviceConcept) {
        serviceConcept = await this.servicePackageService.findServiceConcept(invoice.booking.serviceConceptId);
        serviceConceptCache.set(invoice.booking.serviceConceptId, serviceConcept);
      }

      let servicePackage = servicePackageCache.get(serviceConcept.servicePackageId);
      if (!servicePackage) {
        servicePackage = await this.servicePackageService.findOne(serviceConcept.servicePackageId);
        servicePackageCache.set(serviceConcept.servicePackageId, servicePackage);
      }

      invoice.vendorId = servicePackage.vendor.id;
    }

    return {
      data: invoices,
      pagination: {
        current: currentPage,
        pageSize: pageSizeNum,
        totalPage: totalPages,
        totalItem: total
      }
    };
  }

  async findOne(id: string): Promise<Invoice> {
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

    return invoice;
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