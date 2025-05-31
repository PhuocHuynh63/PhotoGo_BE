import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { FindAllInvoicesDto } from './dto/find-all.dto';
import { BookingService } from '../bookings/booking.service';
import { ServicePackageService } from '../service-package/service-package.service';
import { VoucherService } from '../vouchers/voucher.service';
import e from 'express';
import { InvoiceStatus } from 'src/constants/payment.enum';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { VoucherStatusEnum, VoucherUserStatusEnum, VoucherTypeDiscount } from 'src/constants/voucher.enum';
import { BookingDepositType } from 'src/constants/booking.enum';
@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private bookingService: BookingService,
    private servicePackageService: ServicePackageService,
    private voucherService: VoucherService,
  ) {}

  async create(bookingId, voucherId, createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
    // Kiểm tra xem bookingId có tồn tại trong bảng Booking không
    const booking = await this.bookingService.findOne(bookingId);
    if (!booking) {
      throw new NotFoundException(`Đơn hàng với ID ${bookingId} không tồn tại`);
    }

    // Lấy serviceConcept từ booking
    const serviceConcept = await this.servicePackageService.findServiceConcept(booking.serviceConceptId);
    if (!serviceConcept) {
      throw new NotFoundException(`Gói dịch vụ với ID ${booking.serviceConceptId} không tồn tại`);
    }

    //1. Lay originalPrice tu serviceConcept
    const originalPrice = Math.round(serviceConcept.price);
    
    //2. Tinh discountAmount
    let discountAmount = 0;
    let voucher = null;
    if (voucherId) {
      voucher = await this.voucherService.findOneVoucher(voucherId);
      if (!voucher) {
        throw new NotFoundException(`Voucher với ID ${voucherId} không tồn tại`);
      }
    
      // Kiểm tra voucher còn hiệu lực không
      const now = new Date();
      const startDate = new Date(voucher.startDate);
      const endDate = new Date(voucher.endDate);
      if (now < startDate || now > endDate || voucher.status !== VoucherStatusEnum.ACTIVE) {
        throw new NotFoundException(`Voucher với ID ${voucherId} không hợp lệ`);
      }

      // Kiểm tra giá trị đơn hàng có đủ điều kiện để sử dụng voucher
      if (originalPrice < voucher.minPrice) {
        throw new NotFoundException(`Giá trị đơn hàng phải từ ${voucher.minPrice} để sử dụng voucher này`);
      }

      // Kiểm tra xem user đã sử dụng voucher này chưa
      const voucherUser = await this.voucherService.findOneVoucherUser(voucherId, booking.userId);
      if (!voucherUser || voucherUser.status !== VoucherUserStatusEnum.AVAILABLE) {
        throw new NotFoundException(`Bản ghi voucher-user với voucher_id ${voucherId} và user_id ${booking.userId} không tồn tại hoặc không khả dụng`);
      }

      // Tính toán discountAmount dựa trên voucher
      if (voucher.discount_type === VoucherTypeDiscount.PERCENTAGE) {
        const discountValue = parseFloat(voucher.discount_value);
        discountAmount = Math.round((originalPrice * discountValue) / 100);
        // Kiểm tra nếu discount vượt quá maxPrice
        if (voucher.maxPrice && discountAmount > voucher.maxPrice) {
          discountAmount = voucher.maxPrice;
        }
      } else if (voucher.discount_type === VoucherTypeDiscount.FIXED) {
        discountAmount = Math.round(parseFloat(voucher.discount_value));
        // Kiểm tra nếu discount vượt quá maxPrice
        if (voucher.maxPrice && discountAmount > voucher.maxPrice) {
          discountAmount = voucher.maxPrice;
        }
      }
    }

    //3. Tinh discountedPrice
    const discountedPrice = originalPrice - discountAmount;

    //4. Tinh taxAmount
    const taxAmount = Math.round(discountedPrice * 0.1); // Giả sử thuế là 10%
    
    //5. Tinh feeAmount
    const feeAmount = 0; // Giả sử không có phí nào

    //6. Tinh payablePrice
    const payablePrice = discountedPrice + taxAmount + feeAmount;

    //7. Tính toán số tiền đặt cọc và số tiền còn lại
    let depositAmount = 0;
    let remainingAmount = 0;
    if (booking.depositType === BookingDepositType.PERCENTAGE) {
      // Kiểm tra tỷ lệ đặt cọc tối thiểu
      if (booking.depositAmount < 30) {
        throw new BadRequestException('Tỷ lệ đặt cọc phải tối thiểu 30%');
      }
      depositAmount = Math.round(payablePrice * (booking.depositAmount / 100));
      remainingAmount = payablePrice - depositAmount;
    } else {
      depositAmount = booking.depositAmount;
      remainingAmount = payablePrice - depositAmount;
    }

    // Kiểm tra số tiền hợp lệ
    if (depositAmount <= 0 || remainingAmount <= 0) {
      throw new BadRequestException('Số tiền đặt cọc và số tiền còn lại phải lớn hơn 0');
    }

    // Làm tròn số tiền
    depositAmount = Math.round(depositAmount);
    remainingAmount = Math.round(remainingAmount);

    //8. Tao invoice
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

    // Cập nhật trạng thái voucher thành USED (nếu có voucher)
    if (voucher) {
      await this.voucherService.useVoucher(voucher.id, booking.userId);
    }

    return this.invoiceRepository.save(invoice);
  }

  async findAll(query: FindAllInvoicesDto): Promise<Invoice[]> {
    const qb = this.invoiceRepository.createQueryBuilder('invoice');

    if (query.bookingId) {
      qb.andWhere('invoice.bookingId = :bookingId', { bookingId: query.bookingId });
    }

    if (query.status) {
      qb.andWhere('invoice.status = :status', { status: query.status });
    }

    return await qb.getMany();
  }

  async findOne(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['booking', 'payments', 'refunds'],
    });

    if (!invoice) {
      throw new NotFoundException(`Hóa đơn với ID ${id} không tồn tại`);
    }

    return invoice;
  }
  async updateInvoice(id: string, updateInvoiceDto: Partial<UpdateInvoiceDto>): Promise<Invoice> {
    const invoice = await this.findOne(id);
    Object.assign(invoice, updateInvoiceDto);
    return this.invoiceRepository.save(invoice);
  }

  async deleteInvoice(id: string): Promise<void> {
    const result = await this.invoiceRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Hóa đơn với ID ${id} không tồn tại`);
    }
  }
}