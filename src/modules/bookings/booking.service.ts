import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
import { PaginationDto } from './dto/pagination.dto';
import { LocationAvailabilityService } from '../locations/location-availability.service';
import { LocationSlotTimeWorkingDate } from '../locations/entities/location-slot-time-working-date.entity';
import { LocationWorkingDate } from '../locations/entities/location-workingdate.entity';
import { Location } from '../locations/entities/location.entity';
import { Invoice } from '../invoices/entities/invoice.entity';

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
    private locationAvailabilityService: LocationAvailabilityService,
    @InjectRepository(LocationSlotTimeWorkingDate)
    private locationSlotTimeWorkingDateRepository: Repository<LocationSlotTimeWorkingDate>,
    @InjectRepository(LocationWorkingDate)
    private locationWorkingDateRepository: Repository<LocationWorkingDate>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
  ) { }

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

  // Helper function to convert time string (HH:mm) to minutes
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Helper function to check for overlapping bookings
  private async countOverlappingBookings(
    date: Date,
    startTime: string,
    duration: number,
  ): Promise<number> {
    const startTimeMinutes = this.timeToMinutes(startTime);
    const endTimeMinutes = startTimeMinutes + duration;

    // Get all bookings for the date
    const bookings = await this.bookingRepository.find({
      where: {
        date: date,
        status: BookingStatus.PENDING,
      },
      relations: ['serviceConcept'],
    });

    // Count overlapping bookings
    let count = 0;
    for (const booking of bookings) {
      const bookingStartMinutes = this.timeToMinutes(booking.time);
      const bookingEndMinutes = bookingStartMinutes + booking.serviceConcept.duration;

      // Only check if the start time of the new booking overlaps with existing bookings
      if (bookingStartMinutes >= startTimeMinutes && bookingStartMinutes < endTimeMinutes) {
        count++;
      }
    }
    return count;
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

    // check the date is available
    const workingDate = await this.locationWorkingDateRepository.findOne({
      where: {
        date: new Date(this.convertDateFormat(createBookingDto.date)),
        isAvailable: true
      }
    });

    if (!workingDate) {
      throw new BadRequestException('Ngày này không làm việc');
    }

    // Convert date format from DD/MM/YYYY to YYYY-MM-DD
    const convertedDate = this.convertDateFormat(createBookingDto.date);
    if (!convertedDate) {
      throw new BadRequestException('Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng DD/MM/YYYY');
    }

    if (!createBookingDto.time) {
      throw new BadRequestException('Giờ booking là bắt buộc');
    }

    // Check location availability
    const locationAvailability = await this.locationAvailabilityService.findByDate(
      createBookingDto.date,
      { current: '1', pageSize: '1' }
    );

    if (!locationAvailability.data.length) {
      throw new BadRequestException('Chi nhánh không làm việc vào ngày này');
    }

    const availability = locationAvailability.data[0];
    const slotTimes = availability.slotTimes;

    // Find matching slot time
    const bookingTimeMinutes = this.timeToMinutes(createBookingDto.time);
    const matchingSlot = slotTimes.find(slot => {
      const slotStartMinutes = this.timeToMinutes(slot.startSlotTime);
      const slotEndMinutes = this.timeToMinutes(slot.endSlotTime);
      return bookingTimeMinutes >= slotStartMinutes && bookingTimeMinutes <= slotEndMinutes;
    });

    if (!matchingSlot) {
      throw new BadRequestException('Thời gian đặt lịch không nằm trong khung giờ làm việc');
    }

    // Get slot time working date to check maxParallel
    const slotTimeWorkingDate = await this.locationSlotTimeWorkingDateRepository.findOne({
      where: {
        slotTimeId: matchingSlot.id,
        workingDateId: availability.workingDates[0].id
      }
    });

    if (!slotTimeWorkingDate) {
      throw new BadRequestException('Không tìm thấy thông tin slot time cho ngày này');
    }

    // Check for overlapping bookings with maxParallelBookings
    const overlappingCount = await this.countOverlappingBookings(
      new Date(convertedDate),
      createBookingDto.time,
      serviceConcept.duration
    );
    if (overlappingCount >= slotTimeWorkingDate.maxParallelBookings) {
      throw new BadRequestException(`Không thể đặt lịch vì đã đạt tối đa ${slotTimeWorkingDate.maxParallelBookings} người cho khung giờ này hoặc bị chồng lấn thời gian.`);
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

    // Lấy locationId từ DTO
    if (!createBookingDto.locationId) {
      throw new BadRequestException('locationId là bắt buộc');
    }
    const locationId = createBookingDto.locationId;
    const booking = this.bookingRepository.create({
      ...createBookingDto,
      date: convertedDate, // Use the converted date
      userId,
      serviceConceptId,
      locationId,
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

  async findAll(paginationDto: PaginationDto): Promise<{
    data: Booking[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const { current = 1, pageSize = 10 } = paginationDto;
    const skip = (current - 1) * pageSize;

    const [bookings, total] = await this.bookingRepository.findAndCount({
      relations: ['user', 'serviceConcept', 'serviceConcept.servicePackage', 'histories', 'invoices', 'disputes'],
      skip,
      take: pageSize,
      order: {
        created_at: 'DESC'
      }
    });

    const formattedBookings = bookings.map(booking => {
      const formatted = this.formatBookingDates(booking);
      // Lấy payablePrice từ invoice cuối cùng (nếu có)
      const latestInvoice = booking.invoices && booking.invoices.length > 0
        ? booking.invoices[booking.invoices.length - 1]
        : null;

      return {
        ...formatted,
        payablePrice: latestInvoice ? latestInvoice.payablePrice : null
      };
    });

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: formattedBookings,
      pagination: {
        current: current,
        pageSize: pageSize,
        totalPage: totalPages,
        totalItem: total
      }
    };
  }

  async findAllByUserId(userId: string, paginationDto: PaginationDto): Promise<{
    data: Booking[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const { current = 1, pageSize = 10 } = paginationDto;
    const skip = (current - 1) * pageSize;

    const [bookings, total] = await this.bookingRepository.findAndCount({
      where: { userId },
      relations: ['user', 'histories', 'invoices'],
      skip,
      take: pageSize,
      order: {
        created_at: 'DESC'
      }
    });

    const formattedBookings = bookings.map(booking => {
      const formatted = this.formatBookingDates(booking);
      // Lấy payablePrice từ invoice cuối cùng (nếu có)
      const latestInvoice = booking.invoices && booking.invoices.length > 0
        ? booking.invoices[booking.invoices.length - 1]
        : null;

      return {
        ...formatted,
        payablePrice: latestInvoice ? latestInvoice.payablePrice : null
      };
    });

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: formattedBookings,
      pagination: {
        current: current,
        pageSize: pageSize,
        totalPage: totalPages,
        totalItem: total
      }
    };
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['user', 'serviceConcept', 'serviceConcept.servicePackage', 'histories', 'invoices', 'disputes'],
    });
    if (!booking) {
      throw new NotFoundException(`Booking với ID ${id} không tìm thấy`);
    }

    const formatted = this.formatBookingDates(booking);
    // Lấy payablePrice từ invoice cuối cùng (nếu có)
    const latestInvoice = booking.invoices && booking.invoices.length > 0
      ? booking.invoices[booking.invoices.length - 1]
      : null;

    return {
      ...formatted,
      payablePrice: latestInvoice ? latestInvoice.payablePrice : null
    };
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

  async getPayOSInfoByBookingId(bookingId: string): Promise<{ paymentOSId: string; payosLink: string }> {
    // Find the booking with invoices
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['invoices', 'invoices.payments'],
    });
    if (!booking) {
      throw new NotFoundException(`Booking với ID ${bookingId} không tìm thấy`);
    }
    if (!booking.invoices || booking.invoices.length === 0) {
      throw new NotFoundException('Không tìm thấy hóa đơn cho booking này');
    }
    // Get the latest invoice (by issuedAt)
    const latestInvoice = booking.invoices.reduce((latest, curr) => {
      if (!latest) return curr;
      return new Date(curr.issuedAt) > new Date(latest.issuedAt) ? curr : latest;
    }, null);
    if (!latestInvoice || !latestInvoice.payments || latestInvoice.payments.length === 0) {
      throw new NotFoundException('Không tìm thấy thanh toán cho hóa đơn này');
    }
    // Find the DEPOSIT payment
    const depositPayment = latestInvoice.payments.find(p => p.type === PaymentType.DEPOSIT);
    if (!depositPayment) {
      throw new NotFoundException('Không tìm thấy thanh toán đặt cọc cho hóa đơn này');
    }
    if (!depositPayment.paymentOSId) {
      throw new NotFoundException('Không tìm thấy paymentOSId cho thanh toán này');
    }
    // The payosLink (checkoutUrl) is not stored, so we reconstruct it if possible, or return null
    // If you store the checkoutUrl, replace this logic
    return {
      paymentOSId: depositPayment.paymentOSId,
      payosLink: null // You may need to reconstruct or store this in the future
    };
  }

  async getBookingByPaymentOSId(paymentOSId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { invoices: { payments: { paymentOSId } } },
      relations: ['invoices', 'invoices.payments'],
    });
    if (!booking) {
      throw new NotFoundException(`Booking với paymentOSId ${paymentOSId} không tìm thấy`);
    }
    return this.formatBookingDates(booking);
  }
}