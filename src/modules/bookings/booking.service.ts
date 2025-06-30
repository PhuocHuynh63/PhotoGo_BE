import { BadRequestException, Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
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
import { GetDiscountAmountDto } from './dto/get-booking.dto';
import { CampaignVoucher } from '../campaign/entities/campaign-voucher.entity';
import { VoucherUser } from '../vouchers/entities/voucher-user.entity';
import { MailService } from '../../3rdService/mail/mail.service';
import { LessThan } from 'typeorm';
import { UserRank } from '../../constants/user.enum';
import { SubscriptionService } from '../subscription/subscription.service';
import { SubscriptionPlanService } from '../subscription/subscription-plan.service';
import { SubscriptionStatus } from '../../constants/subscription.enum';

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
    @Inject(forwardRef(() => PaymentService))
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
    @InjectRepository(CampaignVoucher)
    private campaignVoucherRepository: Repository<CampaignVoucher>,
    @InjectRepository(VoucherUser)
    private voucherUserRepository: Repository<VoucherUser>,
    private mailService: MailService,
    private readonly subscriptionService: SubscriptionService,
    private readonly subscriptionPlanService: SubscriptionPlanService,
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

  // New method to handle payment priority and auto-cancel overlapping bookings
  private async handlePaymentPriority(bookingId: string): Promise<void> {
    const currentBooking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['serviceConcept'],
    });

    if (!currentBooking || currentBooking.status !== BookingStatus.CONFIRMED) {
      return;
    }

    const bookingDate = currentBooking.date;
    const bookingTime = currentBooking.time;
    const bookingDuration = currentBooking.serviceConcept.duration;

    // Find all overlapping PENDING bookings for the same time slot
    const overlappingBookings = await this.bookingRepository.find({
      where: {
        date: bookingDate,
        status: BookingStatus.PENDING,
        id: Not(bookingId), // Exclude current booking
      },
      relations: ['serviceConcept', 'user'],
    });

    const startTimeMinutes = this.timeToMinutes(bookingTime);
    const endTimeMinutes = startTimeMinutes + bookingDuration;

    for (const booking of overlappingBookings) {
      const bookingStartMinutes = this.timeToMinutes(booking.time);
      const bookingEndMinutes = bookingStartMinutes + booking.serviceConcept.duration;

      // Check if bookings overlap
      if (
        (bookingStartMinutes >= startTimeMinutes && bookingStartMinutes < endTimeMinutes) ||
        (startTimeMinutes >= bookingStartMinutes && startTimeMinutes < bookingEndMinutes)
      ) {
        // Cancel the overlapping booking
        booking.status = BookingStatus.CANCELLED;
        await this.bookingRepository.save(booking);

        // Create cancellation history
        const history = this.bookingHistoryRepository.create({
          bookingId: booking.id,
          status: BookingStatus.CANCELLED,
        });
        await this.bookingHistoryRepository.save(history);

        // Send notification to user about cancellation
        try {
          await this.mailService.sendBookingCancellationEmail(
            booking.email,
            booking.fullName,
            booking.code,
            booking.date,
            booking.time,
            'Slot thời gian đã được đặt bởi người khác'
          );
        } catch (error) {
          console.error('Error sending cancellation email:', error);
        }
      }
    }
  }

  // New method to check if slot is still available before payment
  private async isSlotStillAvailable(bookingId: string): Promise<boolean> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['serviceConcept'],
    });

    if (!booking) {
      return false;
    }

    // Check if there are any CONFIRMED bookings for the same time slot
    const confirmedBookings = await this.bookingRepository.find({
      where: {
        date: booking.date,
        status: BookingStatus.CONFIRMED,
        id: Not(bookingId),
      },
      relations: ['serviceConcept'],
    });

    const startTimeMinutes = this.timeToMinutes(booking.time);
    const endTimeMinutes = startTimeMinutes + booking.serviceConcept.duration;

    for (const confirmedBooking of confirmedBookings) {
      const confirmedStartMinutes = this.timeToMinutes(confirmedBooking.time);
      const confirmedEndMinutes = confirmedStartMinutes + confirmedBooking.serviceConcept.duration;

      // Check if bookings overlap
      if (
        (confirmedStartMinutes >= startTimeMinutes && confirmedStartMinutes < endTimeMinutes) ||
        (startTimeMinutes >= confirmedStartMinutes && startTimeMinutes < confirmedEndMinutes)
      ) {
        return false; // Slot is no longer available
      }
    }

    return true; // Slot is still available
  }

  // Method to handle booking timeout (can be called by a cron job)
  async handleBookingTimeout(): Promise<{ message: string; cancelledCount: number }> {
    const timeoutMinutes = 15; // 15 minutes timeout for unpaid bookings
    const timeoutDate = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    // Find all PENDING bookings older than timeout
    const expiredBookings = await this.bookingRepository.find({
      where: {
        status: BookingStatus.PENDING,
        created_at: LessThan(timeoutDate),
      },
      relations: ['user', 'serviceConcept'],
    });

    let cancelledCount = 0;

    for (const booking of expiredBookings) {
      // Cancel the expired booking
      booking.status = BookingStatus.CANCELLED;
      await this.bookingRepository.save(booking);

      // Create cancellation history
      const history = this.bookingHistoryRepository.create({
        bookingId: booking.id,
        status: BookingStatus.CANCELLED,
      });
      await this.bookingHistoryRepository.save(history);

      // Unlock the slot
      try {
        await this.locationAvailabilityService.unlockSlot(
          this.formatDate(booking.date),
          booking.time,
          booking.locationId
        );
      } catch (error) {
        console.error('Error unlocking slot during timeout:', error);
      }

      // Send notification to user about timeout
      if (booking.email) {
        try {
          await this.mailService.sendBookingCancellationEmail(
            booking.email,
            booking.fullName,
            booking.code,
            booking.date,
            booking.time,
            'Đặt lịch đã hết hạn do không thanh toán trong thời gian quy định'
          );
        } catch (error) {
          console.error('Error sending timeout email:', error);
        }
      }

      cancelledCount++;
    }

    return {
      message: `Đã hủy ${cancelledCount} booking hết hạn`,
      cancelledCount
    };
  }

  // Method to check slot availability before creating booking
  async checkSlotAvailability(date: string, time: string, locationId: string): Promise<boolean> {
    return await this.locationAvailabilityService.isSlotAvailableForBooking(date, time, locationId);
  }

  // Method to check slot availability with detailed information
  async checkSlotAvailabilityWithDetails(date: string, time: string, locationId: string): Promise<{
    isAvailable: boolean;
    reason?: string;
    alreadyBooked: number;
    maxParallelBookings: number;
  }> {
    try {
      // Use the existing locationAvailabilityService to get availability info
      const availability = await this.locationAvailabilityService.findByDate(date, { current: '1', pageSize: '1' });
      
      if (!availability.data.length) {
        return {
          isAvailable: false,
          reason: 'Chi nhánh không làm việc vào ngày này',
          alreadyBooked: 0,
          maxParallelBookings: 0
        };
      }

      const slotTimes = availability.data[0].slotTimes;
      const bookingTimeMinutes = this.timeToMinutes(time);
      
      // Find matching slot time
      const matchingSlot = slotTimes.find(slot => {
        const slotStartMinutes = this.timeToMinutes(slot.startSlotTime);
        const slotEndMinutes = this.timeToMinutes(slot.endSlotTime);
        return bookingTimeMinutes >= slotStartMinutes && bookingTimeMinutes <= slotEndMinutes;
      });

      if (!matchingSlot) {
        return {
          isAvailable: false,
          reason: 'Thời gian đặt lịch không nằm trong khung giờ làm việc',
          alreadyBooked: 0,
          maxParallelBookings: 0
        };
      }

      // Check if slot is available using the improved method
      const isAvailable = await this.locationAvailabilityService.isSlotAvailableForBooking(date, time, locationId);

      return {
        isAvailable: isAvailable,
        reason: isAvailable ? 'Slot có sẵn' : 'Slot đã được đặt hoặc đang trong quá trình thanh toán',
        alreadyBooked: 0, // Will be calculated by the availability service
        maxParallelBookings: 1 // Default value, will be overridden by actual data
      };
    } catch (error) {
      return {
        isAvailable: false,
        reason: 'Lỗi khi kiểm tra slot',
        alreadyBooked: 0,
        maxParallelBookings: 0
      };
    }
  }

  //#region Create Booking
  async create(
    createBookingDto: CreateBookingDto,
    userId: string,
    serviceConceptId: string,
  ): Promise<{ booking: Booking; paymentLink: string; code: string }> {
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

    // Lấy locationId từ DTO
    if (!createBookingDto.locationId) {
      throw new BadRequestException('locationId là bắt buộc');
    }
    const locationId = createBookingDto.locationId;

    // Check if slot is available before creating booking (includes timeout check)
    const isSlotAvailable = await this.locationAvailabilityService.isSlotAvailableForBooking(
      createBookingDto.date,
      createBookingDto.time,
      locationId
    );

    if (!isSlotAvailable) {
      throw new BadRequestException('Slot thời gian này đã được đặt bởi người khác hoặc đang trong quá trình thanh toán. Vui lòng chọn thời gian khác.');
    }

    // Lock the slot for this booking process
    const slotLocked = await this.locationAvailabilityService.lockSlotForBooking(
      createBookingDto.date,
      createBookingDto.time,
      locationId
    );

    if (!slotLocked) {
      throw new BadRequestException('Không thể khóa slot thời gian. Vui lòng thử lại sau.');
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

    // Generate a random code for booking 6 characters uppercase
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const booking = this.bookingRepository.create({
      ...createBookingDto,
      date: convertedDate,
      userId,
      serviceConceptId,
      locationId,
      status: BookingStatus.PENDING,
      depositAmount: createBookingDto.depositAmount,
      depositType: BookingDepositType.PERCENTAGE,
      code: randomCode
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

    // Set timeout to unlock slot if payment is not completed
    setTimeout(async () => {
      try {
        // Check if booking is still pending
        const currentBooking = await this.bookingRepository.findOne({
          where: { id: savedBooking.id }
        });

        if (currentBooking && currentBooking.status === BookingStatus.PENDING) {
          // Unlock the slot
          await this.locationAvailabilityService.unlockSlot(
            createBookingDto.date,
            createBookingDto.time,
            locationId
          );

          // Cancel the booking
          currentBooking.status = BookingStatus.CANCELLED;
          await this.bookingRepository.save(currentBooking);

          // Create cancellation history
          const timeoutHistory = this.bookingHistoryRepository.create({
            bookingId: currentBooking.id,
            status: BookingStatus.CANCELLED,
          });
          await this.bookingHistoryRepository.save(timeoutHistory);

          // Send notification to user about timeout
          if (currentBooking.email) {
            try {
              await this.mailService.sendBookingCancellationEmail(
                currentBooking.email,
                currentBooking.fullName,
                currentBooking.code,
                currentBooking.date,
                currentBooking.time,
                'Đặt lịch đã hết hạn do không thanh toán trong thời gian quy định'
              );
            } catch (error) {
              console.error('Error sending timeout email:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error in booking timeout handler:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes timeout

    return {
      booking: this.formatBookingDates(savedBooking),
      paymentLink: paymentLinkData.checkoutUrl,
      code: booking.code
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

  async getBookingByCode(code: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({ where: { code } });
    if (!booking) {
      throw new NotFoundException(`Booking với code ${code} không tìm thấy`);
    }
    return this.formatBookingDates(booking);
  }

  async getDiscountAmount(
    userId: string,
    serviceConceptId: string,
    getDiscountAmountDto: GetDiscountAmountDto
  ): Promise<{discount: number, depositAmount: number, remainingAmount: number}> {
    // 1. Find the service concept
    const serviceConcept = await this.serviceConceptRepository.findOne({ where: { id: serviceConceptId } });
    if (!serviceConcept) {
      throw new NotFoundException(`Service Concept với ID ${serviceConceptId} không tìm thấy`);
    }
    const price = Number(serviceConcept.price);
    const depositAmount = getDiscountAmountDto.depositAmount;
    const deposite = (depositAmount * price / 100).toFixed(0);

    // Nếu không có voucherId thì trả về giá gốc, discount = 0
    if (!getDiscountAmountDto.voucherId) {
      return {
        discount: 0,
        depositAmount: Number(deposite),
        remainingAmount: price
      };
    }

    // 2. Find the voucher
    const voucher = await this.voucherRepository.findOne({ where: { id: getDiscountAmountDto.voucherId } });
    if (!voucher) {
      throw new NotFoundException(`Voucher với ID ${getDiscountAmountDto.voucherId} không tìm thấy`);
    }
    // 3. Check if voucher is in campaign
    const campaignVoucher = await this.campaignVoucherRepository.findOne({ where: { voucherId: voucher.id, isAvailable: true } });
    // 4. Check if voucher is assigned to user
    const voucherUser = await this.voucherUserRepository.findOne({ where: { voucher_id: voucher.id, user_id: userId } });
    if (!campaignVoucher && !voucherUser) {
      throw new NotFoundException('Voucher không thuộc campaign hoặc không thuộc user');
    }
    // 5. Check minPrice
    if (price < voucher.minPrice) {
      throw new BadRequestException(`Đơn hàng tối thiểu để áp dụng voucher là ${voucher.minPrice}`);
    }
    // 6. Calculate discount
    let discount = 0;
    if (getDiscountAmountDto.depositType === BookingDepositType.PERCENTAGE) {
      discount = price * depositAmount * (Number(voucher.discount_value) / 100);
    } else {
      discount = price - voucher.discount_value;
    }
    // 7. Cap discount at maxPrice
    if (discount > voucher.maxPrice) {
      discount = voucher.maxPrice;
    }
    let remainingAmount = price - discount - Number(deposite);
    return {
      discount: Number(discount.toFixed(0)),
      depositAmount: Number(deposite),
      remainingAmount: Number(remainingAmount.toFixed(0))
    };
  }

  /**
   * Calculate priority score for a booking
   * Priority score = deposit percentage + subscription score + rank score
   */
  async calculatePriorityScore(booking: Booking, invoice: any): Promise<number> {
    let priorityScore = 0;

    // 1. Calculate deposit percentage
    const depositScore = await this.calculateDepositScore(booking, invoice);
    priorityScore += depositScore;

    // 2. Calculate subscription score
    const subscriptionScore = await this.calculateSubscriptionScore(booking.userId);
    priorityScore += subscriptionScore;

    // 3. Calculate rank score
    const rankScore = this.calculateRankScore(booking.user?.rank);
    priorityScore += rankScore;

    return Math.round(priorityScore * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate deposit score based on deposit percentage
   */
  private async calculateDepositScore(booking: Booking, invoice: any): Promise<number> {
    if (!invoice || !invoice.payablePrice) {
      return 0;
    }

    let depositPercentage = 0;

    if (booking.depositType === BookingDepositType.PERCENTAGE) {
      // If deposit type is percentage, use deposit amount directly
      depositPercentage = booking.depositAmount || 0;
    } else {
      // If deposit type is fixed amount, calculate percentage
      const depositAmount = booking.depositAmount || 0;
      depositPercentage = (depositAmount / invoice.originalPrice) * 100;
    }

    return depositPercentage;
  }

  /**
   * Calculate subscription score based on user's subscription plan
   */
  private async calculateSubscriptionScore(userId: string): Promise<number> {
    try {
      // Get user's active subscriptions
      const subscriptions = await this.subscriptionService.findAll({
        userId,
        status: SubscriptionStatus.ACTIVE,
        current: 1,
        pageSize: 10
      });

      if (!subscriptions.data || subscriptions.data.length === 0) {
        return 0;
      }

      // Get all active subscription plans
      const allPlans = await this.subscriptionPlanService.findAll({ isActive: true });
      
      if (allPlans.length === 0) {
        return 0;
      }

      // Calculate total price of all plans
      const totalPlanPrice = allPlans.reduce((sum, plan) => sum + Number(plan.price), 0);
      
      if (totalPlanPrice === 0) {
        return 0;
      }

      // Get the user's subscription plan price
      const userSubscription = subscriptions.data[0]; // One-to-one relationship
      const userPlanPrice = Number(userSubscription.plan.price);
      
      // Calculate subscription score: (user plan price / total plan price) * 100
      const subscriptionScore = (userPlanPrice / totalPlanPrice) * 100;
      
      return subscriptionScore;
    } catch (error) {
      console.error('Error calculating subscription score:', error);
      return 0;
    }
  }

  /**
   * Calculate rank score based on user's rank
   */
  private calculateRankScore(userRank: string): number {
    const rankScores = {
      [UserRank.BRONZE]: 10,
      [UserRank.SILVER]: 20,
      [UserRank.GOLD]: 50,
      [UserRank.PLATINUM]: 75,
      [UserRank.DIAMOND]: 100,
      [UserRank.UNRANK]: 0,
    };

    return rankScores[userRank] || 0;
  }

  /**
   * Update priority score for a booking
   */
  async updatePriorityScore(bookingId: string): Promise<void> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['user', 'invoices']
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    // Get the first invoice for this booking
    const invoice = booking.invoices?.[0];
    if (!invoice) {
      console.warn(`No invoice found for booking ${bookingId}`);
      return;
    }

    const priorityScore = await this.calculatePriorityScore(booking, invoice);
    
    booking.priorityScore = priorityScore;
    await this.bookingRepository.save(booking);
  }

  /**
   * Get bookings sorted by priority score for vendor approval
   */
  async getBookingsByPriorityScore(
    vendorId: string,
    paginationDto: PaginationDto
  ): Promise<{
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

    const queryBuilder = this.bookingRepository.createQueryBuilder('booking')
      // .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('booking.location', 'location')
      // .leftJoinAndSelect('booking.serviceConcept', 'serviceConcept')
      // .leftJoinAndSelect('booking.invoices', 'invoices')
      // .leftJoinAndSelect('booking.histories', 'histories')
      .where('location.vendorId = :vendorId', { vendorId })
      .andWhere('booking.status = :status', { status: BookingStatus.PENDING || BookingStatus.CONFIRMED })
      .orderBy('booking.priorityScore', 'DESC')
      .addOrderBy('booking.created_at', 'ASC')
      .skip(skip)
      .take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(booking => this.formatBookingDates(booking)),
      pagination: {
        current,
        pageSize,
        totalPage: Math.ceil(total / pageSize),
        totalItem: total
      }
    };
  }
}