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

    // Get the origin price from service concept (stored in DB)
    const originPrice = Number(booking.serviceConcept.price); // This is origin price from DB
    
    // Convert origin price to final price (what customer sees) - same logic as ServicePackageService
    const COMMISSION_RATE = 0.30; // 30%
    const TAX_RATE = 0.05; // 5%
    const TOTAL_MULTIPLIER = 1 + COMMISSION_RATE + TAX_RATE; // 1.35
    
    const finalPrice = Math.round(originPrice * TOTAL_MULTIPLIER); // Final price customer sees
    const commissionAmount = Math.round(originPrice * COMMISSION_RATE);
    const taxAmount = Math.round(originPrice * TAX_RATE);
    
    // For invoice display: originalPrice = originPrice + commission (hidden from customer)
    const price = Math.round(originPrice + commissionAmount);
    const totalAmount = finalPrice; // This is what customer sees
    
    let discountAmount = 0;
    let voucher = null;
    if (voucherId) {
      voucher = await this.voucherService.findOneVoucher(voucherId);
      if (!voucher) {
        throw new NotFoundException(`Voucher với ID ${voucherId} không tồn tại`);
      }

      // Check if user has been assigned the voucher (voucher-user) with status "có sẵn"
      const voucherUser = await this.voucherUserRepository.findOne({
        where: { user_id: booking.userId, voucher_id: voucherId },
      });
      
      if (!voucherUser || voucherUser.status !== VoucherUserStatusEnum.AVAILABLE) {
        throw new BadRequestException('Bạn không có quyền sử dụng voucher này hoặc voucher đã được sử dụng');
      }

      const now = new Date();
      const startDate = new Date(voucher.startDate);
      const endDate = new Date(voucher.endDate);
      if (now < startDate || now > endDate || voucher.status !== VoucherStatusEnum.ACTIVE) {
        throw new BadRequestException(`Voucher với ID ${voucherId} không còn hiệu lực`);
      }

      // Apply voucher discount to the total amount (final price that customer sees)
      if (totalAmount < voucher.minPrice) {
        throw new BadRequestException(`Giá trị đơn hàng phải từ ${voucher.minPrice} để sử dụng voucher này`);
      }

      if (voucher.discount_type === VoucherTypeDiscount.PERCENTAGE) {
        const discountValue = Number(voucher.discount_value);
        discountAmount = Math.round((totalAmount * discountValue) / 100);
        if (voucher.maxPrice && discountAmount > voucher.maxPrice) {
          discountAmount = voucher.maxPrice;
        }
      } else if (voucher.discount_type === VoucherTypeDiscount.FIXED) {
        discountAmount = Math.round(Number(voucher.discount_value));
        if (voucher.maxPrice && discountAmount > voucher.maxPrice) {
          discountAmount = voucher.maxPrice;
        }
      }
    }

    // Calculate final amounts after discount
    const discountedPrice = Math.round(price - discountAmount); // Apply discount to price (origin + commission)
    const discountedTotal = Math.round(totalAmount - discountAmount); // Apply discount to total amount
    
    const feeAmount = 0;
    const payablePrice = Math.round(discountedTotal); // Final amount customer needs to pay

    let depositAmount = 0;
    let remainingAmount = 0;
    if (booking.depositType === BookingDepositType.PERCENTAGE) {
      if (booking.depositAmount < 30) {
        throw new BadRequestException('Tỷ lệ đặt cọc phải tối thiểu 30%');
      }
      depositAmount = Math.round(payablePrice * (booking.depositAmount / 100));
      remainingAmount = payablePrice - depositAmount;
    } else {
      depositAmount = Math.round(booking.depositAmount || 0);
      remainingAmount = payablePrice - depositAmount;
    }

    if (depositAmount < 0 || remainingAmount < 0) {
      throw new BadRequestException('Số tiền đặt cọc và số tiền còn lại phải lớn hơn 0');
    }

    // Ensure all amounts are integers for database storage
    depositAmount = Math.round(depositAmount);
    remainingAmount = Math.round(remainingAmount);

    const invoice = this.invoiceRepository.create({
      ...createInvoiceDto,
      bookingId: booking.id,
      voucherId: voucher?.id || null,
      originalPrice: price, // This is now origin + commission (hidden from customer)
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
        return await this.applyPricingLogic(invoice);
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
      relations: ['booking', 'payments', 'booking.serviceConcept', 'booking.serviceConcept.servicePackage'],
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
        const processedInvoice = await this.applyPricingLogic(invoice);
        
        // Add vendorId for backward compatibility
        if (processedInvoice.booking?.serviceConcept?.servicePackage?.vendor) {
          processedInvoice.vendorId = processedInvoice.booking.serviceConcept.servicePackage.vendor.id;
        }
        
        return processedInvoice;
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

    // Apply pricing logic to the invoice
    return await this.applyPricingLogic(invoice);
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

  /**
   * Apply pricing logic to an invoice
   * This method recalculates all pricing fields based on the current pricing breakdown
   */
  private async applyPricingLogic(invoice: Invoice): Promise<Invoice> {
    try {
      // Get the origin price from service concept (stored in DB)
      const serviceConcept = await this.servicePackageService.findServiceConcept(invoice.booking.serviceConceptId);
      const originPrice = Number(serviceConcept.price); // This is origin price from DB
      
      // Convert origin price to final price (what customer sees) - same logic as ServicePackageService
      const COMMISSION_RATE = 0.30; // 30%
      const TAX_RATE = 0.05; // 5%
      const TOTAL_MULTIPLIER = 1 + COMMISSION_RATE + TAX_RATE; // 1.35
      
      const finalPrice = Math.round(originPrice * TOTAL_MULTIPLIER); // Final price customer sees
      const commissionAmount = Math.round(originPrice * COMMISSION_RATE);
      const taxAmount = Math.round(originPrice * TAX_RATE);
      
      // For invoice display: originalPrice = originPrice + commission (hidden from customer)
      const recalculatedPrice = Math.round(originPrice + commissionAmount);
      const recalculatedTaxAmount = taxAmount;
      const recalculatedTotalAmount = finalPrice; // This is what customer sees
      
      // Apply voucher discount if exists
      let recalculatedDiscountAmount = 0;
      if (invoice.voucherId) {
        const voucher = await this.voucherService.findOneVoucher(invoice.voucherId);
        if (voucher) {
          if (recalculatedTotalAmount >= voucher.minPrice) {
            if (voucher.discount_type === VoucherTypeDiscount.PERCENTAGE) {
              const discountValue = Number(voucher.discount_value);
              recalculatedDiscountAmount = Math.round((recalculatedTotalAmount * discountValue) / 100);
              if (voucher.maxPrice && recalculatedDiscountAmount > voucher.maxPrice) {
                recalculatedDiscountAmount = voucher.maxPrice;
              }
            } else if (voucher.discount_type === VoucherTypeDiscount.FIXED) {
              recalculatedDiscountAmount = Math.round(Number(voucher.discount_value));
              if (voucher.maxPrice && recalculatedDiscountAmount > voucher.maxPrice) {
                recalculatedDiscountAmount = voucher.maxPrice;
              }
            }
          }
        }
      }
      
      // Calculate final amounts after discount
      const recalculatedDiscountedPrice = Math.round(recalculatedPrice - recalculatedDiscountAmount);
      const recalculatedDiscountedTotal = Math.round(recalculatedTotalAmount - recalculatedDiscountAmount);
      const recalculatedPayablePrice = Math.round(recalculatedDiscountedTotal);
      
      // Recalculate deposit and remaining amounts
      let recalculatedDepositAmount = 0;
      let recalculatedRemainingAmount = 0;
      
      if (invoice.booking.depositType === BookingDepositType.PERCENTAGE) {
        recalculatedDepositAmount = Math.round(recalculatedPayablePrice * (invoice.booking.depositAmount / 100));
        recalculatedRemainingAmount = recalculatedPayablePrice - recalculatedDepositAmount;
      } else {
        recalculatedDepositAmount = Math.round(invoice.booking.depositAmount || 0);
        recalculatedRemainingAmount = recalculatedPayablePrice - recalculatedDepositAmount;
      }
      
      // Update invoice with recalculated values
      invoice.originalPrice = recalculatedPrice;
      invoice.discountAmount = recalculatedDiscountAmount;
      invoice.discountedPrice = recalculatedDiscountedPrice;
      invoice.taxAmount = recalculatedTaxAmount;
      invoice.payablePrice = recalculatedPayablePrice;
      invoice.depositAmount = recalculatedDepositAmount;
      invoice.remainingAmount = recalculatedRemainingAmount;
      
      return invoice;
    } catch (error) {
      console.error('Error applying pricing logic to invoice:', error);
      // Return original invoice if pricing logic fails
      return invoice;
    }
  }

  /**
   * Refresh pricing for all invoices
   * This method recalculates pricing for all invoices and updates them in the database
   */
  async refreshAllInvoicePricing(): Promise<{ updatedCount: number; errorCount: number }> {
    let updatedCount = 0;
    let errorCount = 0;

    try {
      const invoices = await this.invoiceRepository.find({
        relations: ['booking', 'booking.serviceConcept', 'booking.serviceConcept.servicePackage']
      });

      for (const invoice of invoices) {
        try {
          const updatedInvoice = await this.applyPricingLogic(invoice);
          
          // Update the invoice in database
          await this.invoiceRepository.update(invoice.id, {
            originalPrice: updatedInvoice.originalPrice,
            discountAmount: updatedInvoice.discountAmount,
            discountedPrice: updatedInvoice.discountedPrice,
            taxAmount: updatedInvoice.taxAmount,
            payablePrice: updatedInvoice.payablePrice,
            depositAmount: updatedInvoice.depositAmount,
            remainingAmount: updatedInvoice.remainingAmount,
          });
          
          updatedCount++;
        } catch (error) {
          console.error(`Error updating invoice ${invoice.id}:`, error);
          errorCount++;
        }
      }

      return { updatedCount, errorCount };
    } catch (error) {
      console.error('Error refreshing invoice pricing:', error);
      throw new BadRequestException('Lỗi khi cập nhật giá hóa đơn');
    }
  }
}