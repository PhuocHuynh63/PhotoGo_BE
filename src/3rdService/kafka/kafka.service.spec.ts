import { Test, TestingModule } from '@nestjs/testing';
import { KafkaService } from './kafka.service';
import { ClientKafka } from '@nestjs/microservices';

describe('KafkaService', () => {
  let service: KafkaService;
  let kafkaClient: ClientKafka;

  const mockKafkaClient = {
    subscribeToResponseOf: jest.fn(),
    connect: jest.fn(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaService,
        {
          provide: 'KAFKA_SERVICE',
          useValue: mockKafkaClient,
        },
      ],
    }).compile();

    service = module.get<KafkaService>(KafkaService);
    kafkaClient = module.get<ClientKafka>('KAFKA_SERVICE');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should subscribe to topics and connect to Kafka', async () => {
      await service.onModuleInit();
      
      expect(mockKafkaClient.subscribeToResponseOf).toHaveBeenCalledWith('booking-requests');
      expect(mockKafkaClient.subscribeToResponseOf).toHaveBeenCalledWith('booking-notifications');
      expect(mockKafkaClient.subscribeToResponseOf).toHaveBeenCalledWith('payment-processing');
      expect(mockKafkaClient.connect).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should send message to Kafka topic', async () => {
      const topic = 'test-topic';
      const message = { type: 'TEST', data: { id: 1 } };

      await service.sendMessage(topic, message);

      expect(mockKafkaClient.emit).toHaveBeenCalledWith(topic, message);
    });

    it('should handle errors when sending message', async () => {
      const topic = 'test-topic';
      const message = { type: 'TEST', data: { id: 1 } };
      const error = new Error('Kafka error');

      mockKafkaClient.emit.mockRejectedValueOnce(error);

      await expect(service.sendMessage(topic, message)).rejects.toThrow('Kafka error');
    });
  });

  describe('handleBookingCreated', () => {
    it('should handle booking created event', async () => {
      const data = { bookingId: '123', status: 'PENDING' };
      
      await service.handleBookingCreated(data);
      
      // Add assertions based on your implementation
      // For example, if you're logging the event:
      expect(console.log).toHaveBeenCalledWith('Received booking created event:', data);
    });
  });
}); 