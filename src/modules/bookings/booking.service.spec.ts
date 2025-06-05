import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from './booking.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { BookingHistory } from './entities/booking-history.entity';
import { ServiceConcept } from '../service-package/entities/service-concept.entity';
import { Voucher } from '../vouchers/entities/voucher.entity';
import { KafkaService } from '../../3rdService/kafka/kafka.service';
import { InvoiceService } from '../invoices/invoice.service';
import { PaymentService } from '../payments/payment.service';
import { BookingSourceType, BookingStatus } from '../../constants/booking.enum';

describe('BookingService', () => {
  let service: BookingService;
  let kafkaService: KafkaService;

  const mockKafkaService = {
    sendMessage: jest.fn(),
  };

  const mockBookingRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockBookingHistoryRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockServiceConceptRepository = {
    findOne: jest.fn(),
  };

  const mockVoucherRepository = {
    findOne: jest.fn(),
  };

  const mockInvoiceService = {
    create: jest.fn(),
  };

  const mockPaymentService = {
    createPayment: jest.fn(),
    createPayOSLink: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
        {
          provide: getRepositoryToken(BookingHistory),
          useValue: mockBookingHistoryRepository,
        },
        {
          provide: getRepositoryToken(ServiceConcept),
          useValue: mockServiceConceptRepository,
        },
        {
          provide: getRepositoryToken(Voucher),
          useValue: mockVoucherRepository,
        },
        {
          provide: KafkaService,
          useValue: mockKafkaService,
        },
        {
          provide: InvoiceService,
          useValue: mockInvoiceService,
        },
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    kafkaService = module.get<KafkaService>(KafkaService);
  });

  describe('create', () => {
    it('should create booking and send Kafka message', async () => {
      const createBookingDto = {
        date: '01/01/2024',
        time: '10:00',
        fullName: 'Test User',
        phone: '0987654321',
        email: 'test@example.com',
        depositAmount: 50,
        sourceType: BookingSourceType.CAMPAIGN,
      };

      const userId = 'user123';
      const serviceConceptId = 'service123';

      const mockServiceConcept = {
        id: serviceConceptId,
        servicePackage: {
          vendorId: 'vendor123',
        },
      };

      const mockBooking = {
        id: 'booking123',
        ...createBookingDto,
        status: BookingStatus.PENDING,
      };

      mockServiceConceptRepository.findOne.mockResolvedValue(mockServiceConcept);
      mockBookingRepository.create.mockReturnValue(mockBooking);
      mockBookingRepository.save.mockResolvedValue(mockBooking);
      mockBookingHistoryRepository.create.mockReturnValue({});
      mockBookingHistoryRepository.save.mockResolvedValue({});
      mockInvoiceService.create.mockResolvedValue({ id: 'invoice123' });
      mockPaymentService.createPayOSLink.mockResolvedValue({ checkoutUrl: 'http://payment-link' });

      const result = await service.create(createBookingDto, userId, serviceConceptId);

      expect(result).toBeDefined();
      expect(mockKafkaService.sendMessage).toHaveBeenCalledWith('booking-requests', {
        type: 'BOOKING_CREATED',
        data: {
          bookingId: mockBooking.id,
          userId,
          serviceConceptId,
          status: BookingStatus.PENDING,
          date: mockBooking.date,
          time: mockBooking.time,
        },
      });
    });
  });

  describe('update', () => {
    it('should update booking and send Kafka notification', async () => {
      const bookingId = 'booking123';
      const updateBookingDto = {
        status: BookingStatus.CONFIRMED,
      };

      const mockBooking = {
        id: bookingId,
        status: BookingStatus.PENDING,
      };

      const updatedBooking = {
        ...mockBooking,
        ...updateBookingDto,
      };

      mockBookingRepository.findOne.mockResolvedValue(mockBooking);
      mockBookingRepository.save.mockResolvedValue(updatedBooking);

      const result = await service.update(bookingId, updateBookingDto);

      expect(result).toBeDefined();
      expect(mockKafkaService.sendMessage).toHaveBeenCalledWith('booking-notifications', {
        type: 'BOOKING_UPDATED',
        data: {
          bookingId,
          status: updateBookingDto.status,
          changes: updateBookingDto,
        },
      });
    });
  });
}); 