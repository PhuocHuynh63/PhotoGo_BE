import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { BookingStatus } from '../../constants/booking.enum';
import { BookingHistory } from './entities/booking-history.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { ServicePackage } from '../service-package/entities/service-package.entity';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(BookingHistory)
    private bookingHistoryRepository: Repository<BookingHistory>,
    @InjectRepository(ServicePackage)
    private servicePackageRepository: Repository<ServicePackage>,
  ) {}

  //#region Create Booking
  async create(
    createBookingDto: CreateBookingDto,
    userId: string,
    servicePackageId: string,
  ): Promise<Booking> {

    const servicePackage = await this.servicePackageRepository.findOne({
      where: { id: servicePackageId },
      relations: ['vendor'],
    });

    if (!servicePackage) {
      throw new NotFoundException(`Service Package with ID ${servicePackageId} not found`);
    }

    const vendorId = servicePackage.vendorId;

    const booking = this.bookingRepository.create({
      ...createBookingDto,
      userId,
      servicePackageId,
      vendorId,
      status: BookingStatus.PENDING,
    });
  
    const savedBooking = await this.bookingRepository.save(booking);
  
    const history = this.bookingHistoryRepository.create({
      bookingId: savedBooking.id,
      status: BookingStatus.PENDING,
    });
    await this.bookingHistoryRepository.save(history);
  
    return savedBooking;
  }  
  //#endregion

  async findAll(): Promise<Booking[]> {
    return this.bookingRepository.find({
      relations: ['user', 'vendor', 'servicePackage', 'histories', 'invoices', 'disputes'],
    });
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }
    return booking;
  }

  async update(id: string, updateBookingDto: UpdateBookingDto): Promise<Booking> {
    const booking = await this.findOne(id);

    if (updateBookingDto.status) {
      booking.status = updateBookingDto.status;

      // Ghi lại lịch sử thay đổi trạng thái
      const history = this.bookingHistoryRepository.create({
        bookingId: booking.id,
        status: updateBookingDto.status,
      });
      await this.bookingHistoryRepository.save(history);
    }

    return this.bookingRepository.save(booking);
  }

  async remove(id: string): Promise<void> {
    const booking = await this.findOne(id);
    await this.bookingRepository.remove(booking);
  }
}