import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingSchedule } from './entities/booking-schedule.entity';
import { Booking } from './entities/booking.entity';
import { CreateBookingScheduleDto, UpdateBookingScheduleDto, PostponeBookingScheduleDto, ContinueBookingScheduleDto } from './dto/booking-schedule.dto';
import { BookingScheduleStatus } from '../../constants/booking.enum';

@Injectable()
export class BookingScheduleService {
  constructor(
    @InjectRepository(BookingSchedule)
    private bookingScheduleRepository: Repository<BookingSchedule>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  async create(bookingId: string, createDto: CreateBookingScheduleDto): Promise<BookingSchedule> {
    // Kiểm tra booking có tồn tại không
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }

    const schedule = this.bookingScheduleRepository.create({
      ...createDto,
      bookingId,
      status: BookingScheduleStatus.SCHEDULED,
    });

    return await this.bookingScheduleRepository.save(schedule);
  }

  async createMultiple(bookingId: string, schedules: CreateBookingScheduleDto[]): Promise<BookingSchedule[]> {
    const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }

    const scheduleEntities = schedules.map(schedule => 
      this.bookingScheduleRepository.create({
        ...schedule,
        bookingId,
        status: BookingScheduleStatus.SCHEDULED,
      })
    );

    return await this.bookingScheduleRepository.save(scheduleEntities);
  }

  async findAllByBooking(bookingId: string): Promise<BookingSchedule[]> {
    return await this.bookingScheduleRepository.find({
      where: { bookingId },
      order: { date: 'ASC' }
    });
  }

  async findOne(id: string): Promise<BookingSchedule> {
    const schedule = await this.bookingScheduleRepository.findOne({
      where: { id },
      relations: ['booking']
    });

    if (!schedule) {
      throw new NotFoundException('Booking schedule không tồn tại');
    }

    return schedule;
  }

  async update(id: string, updateDto: UpdateBookingScheduleDto): Promise<BookingSchedule> {
    const schedule = await this.findOne(id);
    
    Object.assign(schedule, updateDto);
    return await this.bookingScheduleRepository.save(schedule);
  }

  async postpone(id: string, postponeDto: PostponeBookingScheduleDto): Promise<BookingSchedule> {
    const schedule = await this.findOne(id);

    if (schedule.status !== BookingScheduleStatus.SCHEDULED) {
      throw new BadRequestException('Chỉ có thể hoãn lịch đã được lên kế hoạch');
    }

    schedule.status = BookingScheduleStatus.POSTPONED;
    schedule.postponeReason = postponeDto.postponeReason;
    schedule.postponedToDate = new Date(postponeDto.postponedToDate);
    // schedule.notes = postponeDto.notes;

    return await this.bookingScheduleRepository.save(schedule);
  }

  async continue(id: string, continueDto: ContinueBookingScheduleDto): Promise<BookingSchedule> {
    const schedule = await this.findOne(id);

    if (schedule.status !== BookingScheduleStatus.POSTPONED) {
      throw new BadRequestException('Chỉ có thể tiếp tục lịch đã bị hoãn');
    }

    if (!schedule.postponedToDate) {
      throw new BadRequestException('Lịch hoãn chưa có ngày mới');
    }

    schedule.status = BookingScheduleStatus.CONTINUED;
    schedule.date = schedule.postponedToDate;
    // schedule.notes = continueDto.notes || schedule.notes;

    return await this.bookingScheduleRepository.save(schedule);
  }

  async complete(id: string): Promise<BookingSchedule> {
    const schedule = await this.findOne(id);

    if (schedule.status === BookingScheduleStatus.COMPLETED) {
      throw new BadRequestException('Lịch đã hoàn thành');
    }

    if (schedule.status === BookingScheduleStatus.CANCELLED) {
      throw new BadRequestException('Không thể hoàn thành lịch đã hủy');
    }

    schedule.status = BookingScheduleStatus.COMPLETED;
    return await this.bookingScheduleRepository.save(schedule);
  }

  async cancel(id: string, reason?: string): Promise<BookingSchedule> {
    const schedule = await this.findOne(id);

    if (schedule.status === BookingScheduleStatus.COMPLETED) {
      throw new BadRequestException('Không thể hủy lịch đã hoàn thành');
    }

    if (schedule.status === BookingScheduleStatus.CANCELLED) {
      throw new BadRequestException('Lịch đã bị hủy');
    }

    schedule.status = BookingScheduleStatus.CANCELLED;
    if (reason) {
      // schedule.notes = reason;
    }

    return await this.bookingScheduleRepository.save(schedule);
  }

  async delete(id: string): Promise<void> {
    const schedule = await this.findOne(id);
    await this.bookingScheduleRepository.remove(schedule);
  }

  async getBookingScheduleSummary(bookingId: string) {
    const schedules = await this.findAllByBooking(bookingId);
    
    const summary = {
      total: schedules.length,
      scheduled: schedules.filter(s => s.status === BookingScheduleStatus.SCHEDULED).length,
      postponed: schedules.filter(s => s.status === BookingScheduleStatus.POSTPONED).length,
      continued: schedules.filter(s => s.status === BookingScheduleStatus.CONTINUED).length,
      completed: schedules.filter(s => s.status === BookingScheduleStatus.COMPLETED).length,
      cancelled: schedules.filter(s => s.status === BookingScheduleStatus.CANCELLED).length,
    };

    return {
      summary,
      schedules
    };
  }
} 