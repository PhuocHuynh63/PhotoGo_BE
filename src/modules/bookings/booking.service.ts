import { BadRequestException, Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { BookingDepositType, BookingStatus, BookingSourceType, BookingScheduleStatus, BookingType } from '../../constants/booking.enum';
import { ConceptRangeType } from '../../constants/servicePackage.enum';
import { BookingHistory } from './entities/booking-history.entity';
import { BookingSchedule } from './entities/booking-schedule.entity';
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
import { CampaignVendor } from '../campaign/entities/campaign-vendor.entity';
import { VoucherTypeDiscount } from '../../constants/voucher.enum';
import { AlbumStatus } from 'src/constants/album.enum';
import { Album } from '../album/entities/album.entity';
import { VendorAlbum } from '../album/entities/vendor-album.entity';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(BookingHistory)
    private bookingHistoryRepository: Repository<BookingHistory>,
    @InjectRepository(BookingSchedule)
    private bookingScheduleRepository: Repository<BookingSchedule>,
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
    @InjectRepository(Album)
    private albumRepository: Repository<Album>,
    @InjectRepository(VendorAlbum)
    private vendorAlbumRepository: Repository<VendorAlbum>,
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
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Helper function to calculate final price from origin price (same logic as ServicePackageService)
  private calculateFinalPrice(originPrice: number): number {
    const COMMISSION_RATE = 0.30; // 30%
    const TAX_RATE = 0.05; // 5%
    const TOTAL_MULTIPLIER = 1 + COMMISSION_RATE + TAX_RATE; // 1.35
    return Math.round(originPrice * TOTAL_MULTIPLIER);
  }

  // Create single day booking (old logic)
  private async createSingleDayBooking(
    createBookingDto: CreateBookingDto,
    userId: string,
    serviceConceptId: string,
    serviceConcept: ServiceConcept,
  ): Promise<{ booking: Booking; paymentLink: string; code: string }> {
    // Validate concept range type
    if (serviceConcept.conceptRangeType !== ConceptRangeType.SINGLE_DAY) {
      throw new BadRequestException('Concept này không hỗ trợ booking 1 ngày');
    }

    // Validate required fields for single day booking
    if (!createBookingDto.date) {
      throw new BadRequestException('Ngày booking là bắt buộc cho booking 1 ngày');
    }

    if (!createBookingDto.time) {
      throw new BadRequestException('Giờ booking là bắt buộc cho booking 1 ngày');
    }

    // Xử lý time rỗng thành null
    if (createBookingDto.time === "") {
      createBookingDto.time = null;
    }

    // Use the old validation logic for single day booking
    await this.validateSingleDaySchedule(createBookingDto, serviceConcept);

    // Continue with the old booking creation logic
    return await this.createBookingWithOldLogic(createBookingDto, userId, serviceConceptId, serviceConcept);
  }

  // Create multi-day booking (new logic)
  private async createMultiDayBooking(
    createBookingDto: CreateBookingDto,
    userId: string,
    serviceConceptId: string,
    serviceConcept: ServiceConcept,
  ): Promise<{ booking: Booking; paymentLink: string; code: string }> {
    // Validate concept range type
    if (serviceConcept.conceptRangeType !== ConceptRangeType.MULTIPLE_DAYS) {
      throw new BadRequestException('Concept này không hỗ trợ booking nhiều ngày');
    }

    // Validate schedules
    if (!createBookingDto.schedules || createBookingDto.schedules.length === 0) {
      throw new BadRequestException('Danh sách lịch booking là bắt buộc cho booking nhiều ngày');
    }

    // Validate number of days matches concept configuration
    if (createBookingDto.schedules.length !== serviceConcept.numberOfDays) {
      throw new BadRequestException(`Concept này yêu cầu đặt lịch trong ${serviceConcept.numberOfDays} ngày, nhưng bạn đã chọn ${createBookingDto.schedules.length} ngày`);
    }

    // NEW: Check overall availability for all dates
    const availabilityCheck = await this.checkMultiDayAvailability(
      createBookingDto.schedules,
      createBookingDto.locationId,
      serviceConcept
    );

    if (!availabilityCheck.isAvailable) {
      throw new BadRequestException(availabilityCheck.reason);
    }

    // Validate all schedules before creating booking
    for (const schedule of createBookingDto.schedules) {
      await this.validateMultiDaySchedule(schedule, serviceConcept, createBookingDto.locationId);
    }

    // Continue with the new booking creation logic
    return await this.createBookingWithNewLogic(createBookingDto, userId, serviceConceptId, serviceConcept);
  }

  // Helper function to validate a single schedule for multi-day booking
  private async validateMultiDaySchedule(
    schedule: any,
    serviceConcept: ServiceConcept,
    locationId: string,
  ): Promise<void> {
    if (!schedule.date) {
      throw new BadRequestException('Ngày booking là bắt buộc');
    }

    // check the date is available
    const workingDate = await this.locationWorkingDateRepository.findOne({
      where: {
        date: new Date(this.convertDateFormat(schedule.date)),
        isAvailable: true
      }
    });

    if (!workingDate) {
      throw new BadRequestException(`Ngày ${schedule.date} không làm việc`);
    }

    // Convert date format from DD/MM/YYYY to YYYY-MM-DD
    const convertedDate = this.convertDateFormat(schedule.date);
    if (!convertedDate) {
      throw new BadRequestException('Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng DD/MM/YYYY');
    }

    // Check location availability
    const locationAvailability = await this.locationAvailabilityService.findByDate(
      schedule.date,
      { current: '1', pageSize: '1' }
    );

    if (!locationAvailability.data.length) {
      throw new BadRequestException(`Chi nhánh không làm việc vào ngày ${schedule.date}`);
    }

    // NEW: Check if this date is already booked and paid successfully
    const isDateAlreadyBooked = await this.isDateAlreadyBookedAndPaid(
      schedule.date,
      locationId
    );

    if (isDateAlreadyBooked) {
      throw new BadRequestException(`Ngày ${schedule.date} đã được đặt và thanh toán thành công bởi người khác. Vui lòng chọn ngày khác.`);
    }

    // Validate date
    const bookingDate = new Date(convertedDate);
    const currentDate = new Date();

    // Get Vietnam time by adding 7 hours
    const vietnamBookingDate = new Date(bookingDate.getTime() + (7 * 60 * 60 * 1000));
    const vietnamCurrentDate = new Date(currentDate.getTime() + (7 * 60 * 60 * 1000));

    // Reset time part for date comparison
    const bookingDateOnly = new Date(vietnamBookingDate.getFullYear(), vietnamBookingDate.getMonth(), vietnamBookingDate.getDate());
    const currentDateOnly = new Date(vietnamCurrentDate.getFullYear(), vietnamCurrentDate.getMonth(), vietnamCurrentDate.getDate());

    if (bookingDateOnly < currentDateOnly) {
      throw new BadRequestException(`Ngày booking ${schedule.date} không hợp lệ`);
    }
  }

  // NEW: Check if a specific date is already booked and paid successfully
  private async isDateAlreadyBookedAndPaid(
    date: string,
    locationId: string
  ): Promise<boolean> {
    try {
      const convertedDate = this.convertDateFormat(date);
      if (!convertedDate) {
        return false;
      }

      // Find all paid bookings for this date and location
      const paidBookings = await this.bookingRepository.find({
        where: {
          date: new Date(convertedDate),
          locationId: locationId,
          status: BookingStatus.PAID
        }
      });

      // For multi-day bookings, if there's any paid booking on this date, the entire date is considered booked
      return paidBookings.length > 0;
    } catch (error) {
      console.error('Error checking if date is already booked:', error);
      return false;
    }
  }

  // NEW: Check if all dates in a multi-day booking are available
  async checkMultiDayAvailability(schedules: any[], locationId: string, serviceConcept?: ServiceConcept): Promise<{
    isAvailable: boolean;
    unavailableDates: string[];
    reason?: string;
  }> {
    const unavailableDates: string[] = [];

    for (const schedule of schedules) {
      if (!schedule.date) {
        continue;
      }

      // Check if the working date is available
      const workingDate = await this.locationWorkingDateRepository.findOne({
        where: {
          date: new Date(this.convertDateFormat(schedule.date)),
          locationAvailability: {
            location: { id: locationId }
          },
          isAvailable: true
        },
        relations: ['locationAvailability', 'locationAvailability.location']
      });

      if (!workingDate) {
        unavailableDates.push(schedule.date);
        continue;
      }

      // Check if this specific date is already booked and paid
      const isAlreadyBooked = await this.isDateAlreadyBookedAndPaid(
        schedule.date,
        locationId
      );

      if (isAlreadyBooked) {
        unavailableDates.push(schedule.date);
      }
    }

    return {
      isAvailable: unavailableDates.length === 0,
      unavailableDates,
      reason: unavailableDates.length > 0 
        ? `Các ngày sau đã được đặt hoặc không khả dụng: ${unavailableDates.join(', ')}`
        : undefined
    };
  }

  // NEW: Method to reopen all scheduled dates when booking is cancelled
  async reopenScheduledDates(bookingId: string): Promise<void> {
    try {
      const booking = await this.bookingRepository.findOne({
        where: { id: bookingId },
        relations: ['schedules']
      });

      if (!booking || !booking.schedules || booking.schedules.length === 0) {
        return; // Not a multi-day booking
      }

      for (const schedule of booking.schedules) {
        if (schedule.date) {
          // Convert date format from DD/MM/YYYY to YYYY-MM-DD
          const dateStr = typeof schedule.date === 'string' ? schedule.date : this.formatDate(schedule.date);
          const [day, month, year] = dateStr.split('/');
          const convertedDate = `${year}-${month}-${day}`;
          
          // Find and reopen the working date
          const workingDate = await this.locationWorkingDateRepository.findOne({
            where: {
              date: new Date(convertedDate),
              locationAvailability: {
                location: { id: booking.locationId }
              }
            },
            relations: ['locationAvailability', 'locationAvailability.location']
          });

          if (workingDate) {
            workingDate.isAvailable = true;
            await this.locationWorkingDateRepository.save(workingDate);
            console.log(`Reopened date ${schedule.date} for location ${booking.locationId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error reopening scheduled dates:', error);
      throw error;
    }
  }

  // Helper function to validate single day booking (old logic)
  private async validateSingleDaySchedule(
    createBookingDto: CreateBookingDto,
    serviceConcept: ServiceConcept,
  ): Promise<void> {
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

    // Check if slot is available before creating booking (includes timeout check)
    const isSlotAvailable = await this.locationAvailabilityService.isSlotAvailableForBooking(
      createBookingDto.date,
      createBookingDto.time,
      createBookingDto.locationId
    );

    if (!isSlotAvailable) {
      throw new BadRequestException('Slot thời gian này đã được đặt bởi người khác hoặc đang trong quá trình thanh toán. Vui lòng chọn thời gian khác.');
    }

    // Lock the slot for this booking process
    const slotLocked = await this.locationAvailabilityService.lockSlotForBooking(
      createBookingDto.date,
      createBookingDto.time,
      createBookingDto.locationId
    );

    if (!slotLocked) {
      throw new BadRequestException('Không thể khóa slot thời gian. Vui lòng thử lại sau.');
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
      if (createBookingDto.time) {
        const [bookingHours, bookingMinutes] = createBookingDto.time.split(':').map(Number);
        const currentHours = vietnamCurrentDate.getHours();
        const currentMinutes = vietnamCurrentDate.getMinutes();

        const currentTimeInMinutes = currentHours * 60 + currentMinutes;
        const bookingTimeInMinutes = bookingHours * 60 + bookingMinutes;

        if (bookingTimeInMinutes <= currentTimeInMinutes) {
          throw new BadRequestException('Giờ booking không hợp lệ');
        }
      }
    }
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

    // Delete album if booking is timeout, cancelled or failed
    const album = await this.albumRepository.findOne({
      where: { bookingId: booking.id },
    });
    if (album) {
      await this.albumRepository.delete(album.id);
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

    // Route to appropriate booking logic based on concept range type
    if (serviceConcept.conceptRangeType === ConceptRangeType.SINGLE_DAY) {
      return await this.createSingleDayBooking(createBookingDto, userId, serviceConceptId, serviceConcept);
    } else if (serviceConcept.conceptRangeType === ConceptRangeType.MULTIPLE_DAYS) {
      return await this.createMultiDayBooking(createBookingDto, userId, serviceConceptId, serviceConcept);
    } else {
      throw new BadRequestException('Loại concept không hợp lệ');
    }
  }

  // Create booking with old logic (single day)
  private async createBookingWithOldLogic(
    createBookingDto: CreateBookingDto,
    userId: string,
    serviceConceptId: string,
    serviceConcept: ServiceConcept,
  ): Promise<{ booking: Booking; paymentLink: string; code: string }> {
    // --- BẮT ĐẦU KIỂM TRA VOUCHER VÀ CAMPAIGN-VENDOR ---
    if (createBookingDto.voucherId) {
      const voucher = await this.voucherRepository.findOne({ where: { id: createBookingDto.voucherId } });
      if (!voucher) {
        throw new NotFoundException(`Voucher với ID ${createBookingDto.voucherId} không tìm thấy`);
      }
      const campaignVoucher = await this.campaignVoucherRepository.findOne({ where: { voucherId: voucher.id, isAvailable: true }, relations: ['campaign'] });
      if (campaignVoucher) {
        const campaignVendorRepo = this.campaignVoucherRepository.manager.getRepository(CampaignVendor);
        const campaignVendor = await campaignVendorRepo.findOne({ where: { campaign: { id: campaignVoucher.campaign.id }, invited: true, isAvailable: true }, relations: ['vendor'] });
        if (campaignVendor) {
          const conceptVendorId = serviceConcept.servicePackage?.vendor?.id;
          if (!conceptVendorId || conceptVendorId !== campaignVendor.vendor.id) {
            throw new BadRequestException('Voucher này chỉ áp dụng cho dịch vụ thuộc vendor của campaign');
          }
        } else {
          throw new BadRequestException('Voucher này chưa được xác nhận mời vendor hoặc vendor chưa xác nhận tham gia campaign');
        }
      }
    }
    // --- KẾT THÚC KIỂM TRA VOUCHER VÀ CAMPAIGN-VENDOR ---

    // Validate common fields
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

    // Validate source type if provided
    if (createBookingDto.sourceType && !Object.values(BookingSourceType).includes(createBookingDto.sourceType)) {
      throw new BadRequestException('Loại nguồn booking không hợp lệ');
    }

    // Generate a random code for booking 6 characters uppercase
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Convert date format from DD/MM/YYYY to YYYY-MM-DD
    const convertedDate = this.convertDateFormat(createBookingDto.date);
    
    const booking = this.bookingRepository.create({
      ...createBookingDto,
      date: convertedDate,
      userId,
      serviceConceptId,
      locationId: createBookingDto.locationId,
      status: BookingStatus.PENDING,
      depositAmount: createBookingDto.depositAmount,
      depositType: BookingDepositType.PERCENTAGE,
      bookingType: BookingType.SINGLE_DAY,
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
            createBookingDto.locationId
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

    // create album with status not_upload
    // Lấy vendorAlbum theo locationId, nếu không có thì throw lỗi
    const vendorAlbum = await this.vendorAlbumRepository.findOne({
      where: { location: { id: savedBooking.locationId } }
    });
    if (!vendorAlbum) {
      throw new NotFoundException('Không tìm thấy vendor album cho location này');
    }

    const album = this.albumRepository.create({
      bookingId: savedBooking.id,
      status: AlbumStatus.NOT_UPLOAD,
      date: savedBooking.date,
      driveLink: null,
      photos: [],
      behindTheScenes: [],
      vendorAlbum: vendorAlbum,
    });
    await this.albumRepository.save(album);

    return {
      booking: this.formatBookingDates(savedBooking),
      paymentLink: paymentLinkData.checkoutUrl,
      code: randomCode,
    };
  }

  // Create booking with new logic (multi-day)
  private async createBookingWithNewLogic(
    createBookingDto: CreateBookingDto,
    userId: string,
    serviceConceptId: string,
    serviceConcept: ServiceConcept,
  ): Promise<{ booking: Booking; paymentLink: string; code: string }> {
    // --- BẮT ĐẦU KIỂM TRA VOUCHER VÀ CAMPAIGN-VENDOR ---
    if (createBookingDto.voucherId) {
      const voucher = await this.voucherRepository.findOne({ where: { id: createBookingDto.voucherId } });
      if (!voucher) {
        throw new NotFoundException(`Voucher với ID ${createBookingDto.voucherId} không tìm thấy`);
      }
      const campaignVoucher = await this.campaignVoucherRepository.findOne({ where: { voucherId: voucher.id, isAvailable: true }, relations: ['campaign'] });
      if (campaignVoucher) {
        const campaignVendorRepo = this.campaignVoucherRepository.manager.getRepository(CampaignVendor);
        const campaignVendor = await campaignVendorRepo.findOne({ where: { campaign: { id: campaignVoucher.campaign.id }, invited: true, isAvailable: true }, relations: ['vendor'] });
        if (campaignVendor) {
          const conceptVendorId = serviceConcept.servicePackage?.vendor?.id;
          if (!conceptVendorId || conceptVendorId !== campaignVendor.vendor.id) {
            throw new BadRequestException('Voucher này chỉ áp dụng cho dịch vụ thuộc vendor của campaign');
          }
        } else {
          throw new BadRequestException('Voucher này chưa được xác nhận mời vendor hoặc vendor chưa xác nhận tham gia campaign');
        }
      }
    }
    // --- KẾT THÚC KIỂM TRA VOUCHER VÀ CAMPAIGN-VENDOR ---

    // Validate common fields
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

    // Validate source type if provided
    if (createBookingDto.sourceType && !Object.values(BookingSourceType).includes(createBookingDto.sourceType)) {
      throw new BadRequestException('Loại nguồn booking không hợp lệ');
    }

    // Generate a random code for booking 6 characters uppercase
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Use the first schedule for the main booking date
    const firstSchedule = createBookingDto.schedules[0];
    const convertedDate = this.convertDateFormat(firstSchedule.date);
    
    const booking = this.bookingRepository.create({
      ...createBookingDto,
      date: convertedDate,
      userId,
      serviceConceptId,
      locationId: createBookingDto.locationId,
      status: BookingStatus.PENDING,
      depositAmount: createBookingDto.depositAmount,
      depositType: BookingDepositType.PERCENTAGE,
      bookingType: BookingType.MULTI_DAY,
      code: randomCode
    });

    const savedBooking = await this.bookingRepository.save(booking);

    // Create booking schedules for all dates
    const scheduleEntities = createBookingDto.schedules.map(schedule => 
      this.bookingScheduleRepository.create({
        bookingId: savedBooking.id,
        date: new Date(this.convertDateFormat(schedule.date)),
        // notes: schedule.notes,
        status: BookingScheduleStatus.SCHEDULED,
      })
    );

    await this.bookingScheduleRepository.save(scheduleEntities);

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

    // For multi-day booking, we don't set timeout because we don't lock slots
    // The entire day is closed when booking is created

    // create album with status not_upload
    // Lấy vendorAlbum theo locationId, nếu không có thì throw lỗi
    const vendorAlbum = await this.vendorAlbumRepository.findOne({
      where: { location: { id: savedBooking.locationId } }
    });
    if (!vendorAlbum) {
      throw new NotFoundException('Không tìm thấy vendor album cho location này');
    }

    const album = this.albumRepository.create({
      bookingId: savedBooking.id,
      status: AlbumStatus.NOT_UPLOAD,
      date: savedBooking.date,
      driveLink: null,
      photos: [],
      behindTheScenes: [],
      vendorAlbum: vendorAlbum,
    });
    await this.albumRepository.save(album);

    return {
      booking: this.formatBookingDates(savedBooking),
      paymentLink: paymentLinkData.checkoutUrl,
      code: randomCode,
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
      relations: ['user', 'serviceConcept', 'serviceConcept.servicePackage', 'histories', 'invoices', 'disputes', 'schedules'],
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
      const oldStatus = booking.status;
      booking.status = updateBookingDto.status;
      const updatedBooking = await this.bookingRepository.save(booking);

      // NEW: Reopen scheduled dates if booking is cancelled and it's a multi-day booking
      if (updateBookingDto.status === BookingStatus.CANCELLED && 
          oldStatus !== BookingStatus.CANCELLED &&
          booking.schedules && 
          booking.schedules.length > 0) {
        try {
          await this.reopenScheduledDates(id);
        } catch (error) {
          console.error('Error reopening scheduled dates when cancelling booking:', error);
        }
      }

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
    
    // NEW: Reopen scheduled dates if this is a multi-day booking
    if (booking.schedules && booking.schedules.length > 0) {
      try {
        await this.reopenScheduledDates(id);
      } catch (error) {
        console.error('Error reopening scheduled dates when removing booking:', error);
      }
    }
    
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

  // Thêm hàm kiểm tra membership
  private async hasActiveMembership(userId: string): Promise<boolean> {
    const activeMemberships = await this.subscriptionService.findAll({
      userId,
      status: SubscriptionStatus.ACTIVE,
      current: 1,
      pageSize: 10
    });

    if (!activeMemberships.data || activeMemberships.data.length === 0) return false;

    return activeMemberships.data.some(sub => sub.plan?.name?.toLowerCase() === 'membership');
  }

  /**
   * Tính phí phát sinh (rush fee) dựa trên membership và số ngày đặt trước
   */
  public async calculateRushFee(userId: string, bookingDate: Date, finalPrice: number): Promise<number> {
    const today = new Date();
    today.setHours(0,0,0,0);
    let diffDays = 0;
    if (bookingDate) {
      diffDays = Math.ceil((bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    const hasMembership = await this.hasActiveMembership(userId);
    if (hasMembership && diffDays >= 3) {
      return 0;
    } else if (diffDays < 7) {
      return Math.round(finalPrice * 0.05);
    }
    return 0;
  }

  async getDiscountAmount(
    userId: string,
    serviceConceptId: string,
    getDiscountAmountDto: GetDiscountAmountDto
  ): Promise<{ discount: number, depositAmount: number, remainingAmount: number, rushFee?: number, totalPayable?: number }> {
    // 1. Find the service concept
    const serviceConcept = await this.serviceConceptRepository.findOne({ 
      where: { id: serviceConceptId }, 
      relations: ['servicePackage', 'servicePackage.vendor'] 
    });
    
    if (!serviceConcept) {
      throw new NotFoundException(`Service Concept với ID ${serviceConceptId} không tìm thấy`);
    }

    // Get the final price (customer price) from origin price stored in DB
    const originPrice = Number(serviceConcept.price);
    const finalPrice = this.calculateFinalPrice(originPrice); // Convert to final price for customer
    const depositPercentage = getDiscountAmountDto.depositAmount;
    const depositType = getDiscountAmountDto.depositType || BookingDepositType.PERCENTAGE;

    // Validate deposit percentage
    if (!depositPercentage || depositPercentage < 30 || depositPercentage > 100) {
      throw new BadRequestException('Tỷ lệ đặt cọc phải từ 30% đến 100%');
    }

    // --- TÍNH PHÍ PHÁT SINH (RUSH FEE) ---
    // Lấy ngày booking từ DTO
    const bookingDateStr = getDiscountAmountDto.date;
    let bookingDate: Date = null;
    if (bookingDateStr) {
      bookingDate = new Date(this.convertDateFormat(bookingDateStr));
    }
    // Gọi hàm calculateRushFee
    const rushFee = await this.calculateRushFee(userId, bookingDate, finalPrice);
    // --- END RUSH FEE ---

    // If no voucher, return calculation based on final price
    if (!getDiscountAmountDto.voucherId) {
      const depositAmount = (finalPrice * depositPercentage / 100);
      const remainingAmount = finalPrice - depositAmount;
      const totalPayable = finalPrice + rushFee;
      return {
        discount: 0,
        depositAmount: Math.round(depositAmount),
        remainingAmount: Math.round(remainingAmount),
        rushFee: Math.round(rushFee),
        totalPayable: Math.round(totalPayable)
      };
    }

    // 2. Find and validate voucher
    const voucher = await this.voucherRepository.findOne({ 
      where: { id: getDiscountAmountDto.voucherId } 
    });
    
    if (!voucher) {
      throw new NotFoundException(`Voucher với ID ${getDiscountAmountDto.voucherId} không tìm thấy`);
    }

    // 3. Check voucher availability and ownership
    const campaignVoucher = await this.campaignVoucherRepository.findOne({ 
      where: { voucherId: voucher.id, isAvailable: true }, 
      relations: ['campaign'] 
    });
    
    const voucherUser = await this.voucherUserRepository.findOne({ 
      where: { voucher_id: voucher.id, user_id: userId } 
    });
    
    if (!campaignVoucher && !voucherUser) {
      throw new NotFoundException('Voucher không thuộc campaign hoặc không thuộc user');
    }

    // 4. Validate vendor compatibility for campaign vouchers
    if (campaignVoucher) {
      const campaignVendorRepo = this.campaignVoucherRepository.manager.getRepository(CampaignVendor);
      const campaignVendor = await campaignVendorRepo.findOne({ 
        where: { campaign: { id: campaignVoucher.campaign.id }, invited: true, isAvailable: true }, 
        relations: ['vendor'] 
      });
      
      if (campaignVendor) {
        const conceptVendorId = serviceConcept.servicePackage?.vendor?.id;
        if (!conceptVendorId || conceptVendorId !== campaignVendor.vendor.id) {
          throw new BadRequestException('Voucher này chỉ áp dụng cho dịch vụ thuộc vendor của campaign');
        }
      }
    }

    // 5. Check minimum price requirement
    if (finalPrice < voucher.minPrice) {
      throw new BadRequestException(`Đơn hàng tối thiểu để áp dụng voucher là ${voucher.minPrice.toLocaleString('vi-VN')} VNĐ`);
    }

    // Check if voucher is still valid (not expired)
    const currentDate = new Date();
    const startDate = new Date(voucher.start_date);
    const endDate = new Date(voucher.end_date);
    
    if (currentDate < startDate || currentDate > endDate) {
      throw new BadRequestException('Voucher đã hết hạn hoặc chưa đến thời gian sử dụng');
    }

    // Check if voucher usage limit is reached
    if (voucher.usedCount >= voucher.quantity) {
      throw new BadRequestException('Voucher đã hết lượt sử dụng');
    }

    // 6. Calculate discount amount
    let discountAmount = 0;
    
    if (voucher.discount_type === VoucherTypeDiscount.PERCENTAGE) {
      // Percentage discount
      discountAmount = finalPrice * (Number(voucher.discount_value) / 100);
    } else if (voucher.discount_type === VoucherTypeDiscount.FIXED) {
      // Fixed amount discount
      discountAmount = Number(voucher.discount_value);
    } else {
      throw new BadRequestException('Loại giảm giá voucher không hợp lệ');
    }

    // 7. Cap discount at maximum allowed
    if (discountAmount > voucher.maxPrice) {
      discountAmount = voucher.maxPrice;
    }

    // 8. Calculate final price after discount and ensure it's not negative
    let discountedFinalPrice = finalPrice - discountAmount;
    
    // Ensure final price is not negative
    if (discountedFinalPrice < 0) {
      discountAmount = finalPrice;
      discountedFinalPrice = 0;
    }

    // 9. Calculate deposit amount based on final price
    const depositAmount = (discountedFinalPrice * depositPercentage / 100);
    
    // 10. Calculate remaining amount
    const remainingAmount = discountedFinalPrice - depositAmount;

    // 11. Tổng tiền phải trả (cộng rushFee)
    const totalPayable = discountedFinalPrice + rushFee;

    return {
      discount: Math.round(discountAmount),
      depositAmount: Math.round(depositAmount),
      remainingAmount: Math.round(remainingAmount),
      rushFee: Math.round(rushFee),
      totalPayable: Math.round(totalPayable)
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