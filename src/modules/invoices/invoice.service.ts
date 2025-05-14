import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { FindAllInvoicesDto } from './dto/find-all.dto';
import { BookingService } from '../bookings/booking.service';
import { ServicePackageService } from '../service-package/service-package.service';
import { VoucherService } from '../vouchers/voucher.service';
import e from 'express';
import { InvoiceStatus } from 'src/constants/booking.enum';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { VoucherStatusEnum, VoucherUserStatusEnum } from 'src/constants/voucher.enum';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private bookingService: BookingService,
    private servicePackageService: ServicePackageService,
    private voucherService: VoucherService,
  ) {}

  async create(bookingId,voucherId,createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
    // Kiểm tra xem bookingId có tồn tại trong bảng Booking không
    const booking = await this.bookingService.findOne(bookingId);
    if (!booking) {
      throw new NotFoundException(`Đơn hàng với ID ${bookingId} không tồn tại`);
    }

    // Lấy servicePackage từ booking
    const servicePackage = await this.servicePackageService.findOne(booking.servicePackageId);
    if (!servicePackage) {
      throw new NotFoundException(`Gói dịch vụ với ID ${booking.servicePackageId} không tồn tại`);
    }

    //1. Lay originalPrice tu servicePackage
    const originalPrice = Math.round(servicePackage.price);

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
      if (now > startDate || now < endDate || voucher.status !== VoucherStatusEnum.ACTIVE) {
        throw new NotFoundException(`Voucher với ID ${voucherId} không hợp lệ`);
      }

      // Tính toán discountAmount dựa trên voucher
      if (voucher.discountType === 'PERCENTAGE') {
        discountAmount = (originalPrice * voucher.discountValue) / 100;
      } else if (voucher.discountType === 'FIXED') {
        discountAmount = voucher.discountValue;
      }

      //3. Tinh discountedPrice
      const discountedPrice = originalPrice - discountAmount;

      //4. Tinh taxAmount
      const taxAmount = discountedPrice * 0.1; // Giả sử thuế là 10%
      
      //5. Tinh feeAmount
      const feeAmount = 0; // Giả sử không có phí nào

      //6. Tinh payablePrice
      const payablePrice = discountedPrice + taxAmount + feeAmount;

      //7. Tao invoice
      const invoice = this.invoiceRepository.create({
        ...createInvoiceDto,
        booking,
        originalPrice,
        discountAmount,
        discountedPrice,
        taxAmount,
        feeAmount,
        payablePrice,
        status: InvoiceStatus.PENDING,
      });

      // Cập nhật trạng thái voucher thành USED (nếu cần)
      await this.voucherService.useVoucher(voucher.id,booking.userId);
      return this.invoiceRepository.save(invoice);
    }
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
    await this.invoiceRepository.update(id, updateInvoiceDto);
    return this.findOne(id);
  }

  async deleteInvoice(id: string): Promise<void> {
    const result = await this.invoiceRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Hóa đơn với ID ${id} không tồn tại`);
    }
  }
}