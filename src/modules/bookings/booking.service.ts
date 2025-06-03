import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { BookingDepositType, BookingStatus, BookingSourceType } from '../../constants/booking.enum';
import { BookingHistory } from './entities/booking-history.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { ServiceConcept } from '../service-package/entities/service-concept.entity';
import { InvoiceService } from '../invoices/invoice.service';
import { Voucher } from '../vouchers/entities/voucher.entity';
import { PaymentService } from '../payments/payment.service';
import { PaymentType } from '../../constants/payment.enum';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(BookingHistory)
    private bookingHistoryRepository: Repository<BookingHistory>,
    @InjectRepository(ServiceConcept)
    private serviceConceptRepository: Repository<ServiceConcept>,
    @InjectRepository(Voucher)
    private voucherRepository: Repository<Voucher>,
    private invoiceService: InvoiceService,
    private paymentService: PaymentService,
  ) {}

  // Helper function to convert DD/MM/YYYY to YYYY-MM-DD
  private convertDateFormat(dateStr: string): string {
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }

  // Helper function to format date to DD/MM/YYYY
  private formatDate(date: Date): string {
    if (!date) return null;
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Helper function to format booking dates
  private formatBookingDates(booking: Booking): any {
    if (!booking) return booking;
    return {
      ...booking,
      date: this.formatDate(booking.date),
      created_at: this.formatDate(booking.created_at),
      updated_at: this.formatDate(booking.updated_at),
      histories: booking.histories?.map(history => ({
        ...history,
        changedAt: this.formatDate(history.changedAt)
      }))
    };
  }

  //#region Create Booking
  async create(
    createBookingDto: CreateBookingDto,
    userId: string,
    serviceConceptId: string,
  ): Promise<{ booking: Booking; paymentLink: string }> {
    // Validate service concept
    const serviceConcept = await this.serviceConceptRepository.findOne({
      where: { id: serviceConceptId },
      relations: ['servicePackage', 'servicePackage.vendor'],
    });

    if (!serviceConcept) {
      throw new NotFoundException(`Khái niệm dịch vụ với ID ${serviceConceptId} không tìm thấy`);
    }

    // Validate required fields
    if (!createBookingDto.date) {
      throw new BadRequestException('Ngày booking là bắt buộc');
    }

    // Convert date format from DD/MM/YYYY to YYYY-MM-DD
    const convertedDate = this.convertDateFormat(createBookingDto.date);
    if (!convertedDate) {
      throw new BadRequestException('Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng DD/MM/YYYY');
    }

    if (!createBookingDto.time) {
      throw new BadRequestException('Giờ booking là bắt buộc');
    }

    if (!createBookingDto.fullName) {
      throw new BadRequestException('Họ tên là bắt buộc');
    }

    if (!createBookingDto.phone) {
      throw new BadRequestException('Số điện thoại là bắt buộc');
    }

    // Validate phone number format (Vietnamese phone number)
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(createBookingDto.phone)) {
      throw new BadRequestException('Số điện thoại không hợp lệ');
    }

    if (createBookingDto.email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(createBookingDto.email)) {
        throw new BadRequestException('Email không hợp lệ');
      }
    }


    if (!createBookingDto.depositAmount) {
      throw new BadRequestException('Số tiền đặt cọc là bắt buộc');
    }


    if (createBookingDto.depositAmount < 30) {
      throw new BadRequestException('Tỷ lệ đặt cọc phải tối thiểu 30%');
    }
    if (createBookingDto.depositAmount > 100) {
      throw new BadRequestException('Tỷ lệ đặt cọc không được vượt quá 100%');
    }

    // Validate date and time
    const bookingDate = new Date(convertedDate);
    const currentDate = new Date();

    // Get Vietnam time by adding 7 hours
    const vietnamBookingDate = new Date(bookingDate.getTime() + (7 * 60 * 60 * 1000));
    const vietnamCurrentDate = new Date(currentDate.getTime() + (7 * 60 * 60 * 1000));

    // Reset time part for date comparison
    const bookingDateOnly = new Date(vietnamBookingDate.getFullYear(), vietnamBookingDate.getMonth(), vietnamBookingDate.getDate());
    const currentDateOnly = new Date(vietnamCurrentDate.getFullYear(), vietnamCurrentDate.getMonth(), vietnamCurrentDate.getDate());

    if (bookingDateOnly < currentDateOnly) {
      throw new BadRequestException('Ngày booking không hợp lệ');
    }

    // If same day, check time
    if (bookingDateOnly.getTime() === currentDateOnly.getTime()) {
      // Parse time string (HH:mm) to hours and minutes
      const [bookingHours, bookingMinutes] = createBookingDto.time.split(':').map(Number);
      const currentHours = vietnamCurrentDate.getHours();
      const currentMinutes = vietnamCurrentDate.getMinutes();

      const currentTimeInMinutes = currentHours * 60 + currentMinutes;
      const bookingTimeInMinutes = bookingHours * 60 + bookingMinutes;

      if (bookingTimeInMinutes <= currentTimeInMinutes) {
        throw new BadRequestException('Giờ booking không hợp lệ');
      }
    }

    // Validate source type if provided
    if (createBookingDto.sourceType && !Object.values(BookingSourceType).includes(createBookingDto.sourceType)) {
      throw new BadRequestException('Loại nguồn booking không hợp lệ');
    }

    const vendorId = serviceConcept.servicePackage.vendorId;
    const booking = this.bookingRepository.create({
      ...createBookingDto,
      date: convertedDate, // Use the converted date
      userId,
      serviceConceptId,
      vendorId,
      status: BookingStatus.PENDING,
      depositAmount: createBookingDto.depositAmount,
      depositType: BookingDepositType.PERCENTAGE,
    });

    const savedBooking = await this.bookingRepository.save(booking);

    // Find voucher if provided
    let voucher = null;
    if (createBookingDto.voucherId) {
      voucher = await this.voucherRepository.findOne({
        where: { id: createBookingDto.voucherId },
      });
    }
      
    const history = this.bookingHistoryRepository.create({
      bookingId: savedBooking.id,
      status: BookingStatus.PENDING,
    });
    await this.bookingHistoryRepository.save(history);

    // Create invoice using InvoiceService
    const invoice = await this.invoiceService.create(
      savedBooking.id,
      voucher?.id,
      {
        issuedAt: new Date().toISOString(),
      }
    );

    // Create payment link for deposit
    const paymentLinkData = await this.paymentService.createPayOSLink(invoice.id, PaymentType.DEPOSIT);
  
    return {
      booking: this.formatBookingDates(savedBooking),
      paymentLink: paymentLinkData.checkoutUrl
    };
  }
  //#endregion

  async findAll(): Promise<Booking[]> {
    const bookings = await this.bookingRepository.find({
      relations: ['user', 'vendor', 'serviceConcept', 'serviceConcept.servicePackage', 'histories', 'invoices', 'disputes'],
    });
    return bookings.map(booking => this.formatBookingDates(booking));
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['user', 'vendor', 'serviceConcept', 'serviceConcept.servicePackage', 'histories', 'invoices', 'disputes'],
    });
    if (!booking) {
      throw new NotFoundException(`Booking với ID ${id} không tìm thấy`);
    }
    return this.formatBookingDates(booking);
  }

  async update(id: string, updateBookingDto: UpdateBookingDto): Promise<Booking> {
    const booking = await this.findOne(id);

    // Validate status if provided
    if (updateBookingDto.status) {
      if (!Object.values(BookingStatus).includes(updateBookingDto.status)) {
        throw new BadRequestException('Trạng thái booking không hợp lệ');
      }

      // Validate status transition
      const currentStatus = booking.status;
      const newStatus = updateBookingDto.status;

      // Define valid status transitions
      const validTransitions = {
        [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
        [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
        [BookingStatus.COMPLETED]: [],
        [BookingStatus.CANCELLED]: [],
      };

      if (!validTransitions[currentStatus].includes(newStatus)) {
        throw new BadRequestException(`Không thể chuyển trạng thái từ ${currentStatus} sang ${newStatus}`);
      }
    }

    // Validate date if provided
    if (updateBookingDto.date) {
      const bookingDate = new Date(updateBookingDto.date);
      const currentDate = new Date();

      // Get Vietnam time by adding 7 hours
      const vietnamBookingDate = new Date(bookingDate.getTime() + (7 * 60 * 60 * 1000));
      const vietnamCurrentDate = new Date(currentDate.getTime() + (7 * 60 * 60 * 1000));

      // Reset time part for date comparison
      const bookingDateOnly = new Date(vietnamBookingDate.getFullYear(), vietnamBookingDate.getMonth(), vietnamBookingDate.getDate());
      const currentDateOnly = new Date(vietnamCurrentDate.getFullYear(), vietnamCurrentDate.getMonth(), vietnamCurrentDate.getDate());

      if (bookingDateOnly < currentDateOnly) {
        throw new BadRequestException('Ngày booking không hợp lệ');
      }
    }

    // Validate time if provided
    if (updateBookingDto.time) {
      const [hours, minutes] = updateBookingDto.time.split(':').map(Number);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new BadRequestException('Giờ booking không hợp lệ');
      }

      // If updating time on the same day as current date, check if it's in the future
      if (updateBookingDto.date) {
        const bookingDate = new Date(updateBookingDto.date);
        const currentDate = new Date();
        const vietnamBookingDate = new Date(bookingDate.getTime() + (7 * 60 * 60 * 1000));
        const vietnamCurrentDate = new Date(currentDate.getTime() + (7 * 60 * 60 * 1000));

        const bookingDateOnly = new Date(vietnamBookingDate.getFullYear(), vietnamBookingDate.getMonth(), vietnamBookingDate.getDate());
        const currentDateOnly = new Date(vietnamCurrentDate.getFullYear(), vietnamCurrentDate.getMonth(), vietnamCurrentDate.getDate());

        if (bookingDateOnly.getTime() === currentDateOnly.getTime()) {
          const currentHours = vietnamCurrentDate.getHours();
          const currentMinutes = vietnamCurrentDate.getMinutes();
          const currentTimeInMinutes = currentHours * 60 + currentMinutes;
          const bookingTimeInMinutes = hours * 60 + minutes;

          if (bookingTimeInMinutes <= currentTimeInMinutes) {
            throw new BadRequestException('Giờ booking không hợp lệ');
          }
        }
      }
    }

    // Validate phone if provided
    if (updateBookingDto.phone) {
      const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
      if (!phoneRegex.test(updateBookingDto.phone)) {
        throw new BadRequestException('Số điện thoại không hợp lệ');
      }
    }

    // Validate email if provided
    if (updateBookingDto.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateBookingDto.email)) {
        throw new BadRequestException('Email không hợp lệ');
      }
    }

    // Validate deposit if provided
    if (updateBookingDto.depositType || updateBookingDto.depositAmount) {
      if (updateBookingDto.depositType && !Object.values(BookingDepositType).includes(updateBookingDto.depositType)) {
        throw new BadRequestException('Loại đặt cọc không hợp lệ');
      }

      if (updateBookingDto.depositAmount) {
        const depositType = updateBookingDto.depositType || booking.depositType;
        if (depositType === BookingDepositType.PERCENTAGE) {
          if (updateBookingDto.depositAmount < 30) {
            throw new BadRequestException('Tỷ lệ đặt cọc phải tối thiểu 30%');
          }
          if (updateBookingDto.depositAmount > 100) {
            throw new BadRequestException('Tỷ lệ đặt cọc không được vượt quá 100%');
          }
        }
      }
    }

    // Validate source type if provided
    if (updateBookingDto.sourceType && !Object.values(BookingSourceType).includes(updateBookingDto.sourceType)) {
      throw new BadRequestException('Loại nguồn booking không hợp lệ');
    }

    // Update booking
    if (updateBookingDto.status) {
      booking.status = updateBookingDto.status;
      const updatedBooking = await this.bookingRepository.save(booking);

      // Create a new history record
      const history = this.bookingHistoryRepository.create({
        bookingId: updatedBooking.id,
        status: updateBookingDto.status,
      });
      await this.bookingHistoryRepository.save(history);

      return this.formatBookingDates(updatedBooking);
    }

    // Update other fields
    Object.assign(booking, updateBookingDto);
    const updatedBooking = await this.bookingRepository.save(booking);
    return this.formatBookingDates(updatedBooking);
  }

  async remove(id: string): Promise<void> {
    const booking = await this.findOne(id);
    await this.bookingRepository.remove(booking);
  }
}