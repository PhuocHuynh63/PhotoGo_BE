import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { BookingStatus } from '../../constants/booking.enum';
import { BookingHistory } from './entities/booking-history.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { ServiceConcept } from '../service-package/entities/service-concept.entity';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(BookingHistory)
    private bookingHistoryRepository: Repository<BookingHistory>,
    @InjectRepository(ServiceConcept)
    private serviceConceptRepository: Repository<ServiceConcept>,
  ) {}

  //#region Create Booking
  async create(
    createBookingDto: CreateBookingDto,
    userId: string,
    serviceConceptId: string,
  ): Promise<Booking> {
    const serviceConcept = await this.serviceConceptRepository.findOne({
      where: { id: serviceConceptId },
      relations: ['servicePackage', 'servicePackage.vendor'],
    });

    if (!serviceConcept) {
      throw new NotFoundException(`Khái niệm dịch vụ với ID ${serviceConceptId} không tìm thấy`);
    }

    const vendorId = serviceConcept.servicePackage.vendorId;

    const booking = this.bookingRepository.create({
      ...createBookingDto,
      userId,
      serviceConceptId,
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
      relations: ['user', 'vendor', 'serviceConcept', 'serviceConcept.servicePackage', 'histories', 'invoices', 'disputes'],
    });
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['user', 'vendor', 'serviceConcept', 'serviceConcept.servicePackage', 'histories', 'invoices', 'disputes'],
    });
    if (!booking) {
      throw new NotFoundException(`Booking với ID ${id} không tìm thấy`);
    }
    return booking;
  }

  async update(id: string, updateBookingDto: UpdateBookingDto): Promise<Booking> {
    const booking = await this.findOne(id);

    if (updateBookingDto.status) {
      // Update booking status
      booking.status = updateBookingDto.status;
      const updatedBooking = await this.bookingRepository.save(booking);

      // Create a new history record with the correct booking ID
      const history = this.bookingHistoryRepository.create({
        bookingId: updatedBooking.id,
        status: updateBookingDto.status,
      });
      
      // Save the new history record
      await this.bookingHistoryRepository.save(history);
      
      return updatedBooking;
    }

    return booking;
  }

  async remove(id: string): Promise<void> {
    const booking = await this.findOne(id);
    await this.bookingRepository.remove(booking);
  }
}