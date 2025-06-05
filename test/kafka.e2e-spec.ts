import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { KafkaService } from '../src/3rdService/kafka/kafka.service';
import { BookingStatus } from '../src/constants/booking.enum';

describe('Kafka Integration (e2e)', () => {
  let app: INestApplication;
  let kafkaService: KafkaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    kafkaService = moduleFixture.get<KafkaService>(KafkaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Booking Flow with Kafka', () => {
    it('should create booking and trigger Kafka events', async () => {
      // Mock Kafka service
      const mockSendMessage = jest.spyOn(kafkaService, 'sendMessage');

      // Create booking
      const createBookingDto = {
        date: '01/01/2024',
        time: '10:00',
        fullName: 'Test User',
        phone: '0987654321',
        email: 'test@example.com',
        depositAmount: 50,
      };

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .send(createBookingDto)
        .expect(201);

      // Verify Kafka message was sent
      expect(mockSendMessage).toHaveBeenCalledWith('booking-requests', {
        type: 'BOOKING_CREATED',
        data: expect.objectContaining({
          status: BookingStatus.PENDING,
        }),
      });

      // Update booking status
      const bookingId = response.body.id;
      const updateResponse = await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}`)
        .send({ status: BookingStatus.CONFIRMED })
        .expect(200);

      // Verify Kafka notification was sent
      expect(mockSendMessage).toHaveBeenCalledWith('booking-notifications', {
        type: 'BOOKING_UPDATED',
        data: expect.objectContaining({
          status: BookingStatus.CONFIRMED,
        }),
      });
    });
  });
}); 