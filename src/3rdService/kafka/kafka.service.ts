import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Consumer, Kafka } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit {
  private readonly logger = new Logger(KafkaService.name);
  private consumer: Consumer;

  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {
    const kafka = new Kafka({
      clientId: 'photogo-service',
      brokers: ['localhost:9092'],
    });
    this.consumer = kafka.consumer({ groupId: 'photogo-consumer-group' });
  }

  async onModuleInit() {
    await this.consumer.connect();
    this.logger.log('Kafka consumer connected successfully');
  }

  async subscribe(topic: string, handler: (message: any) => Promise<void>) {
    await this.consumer.subscribe({ topic, fromBeginning: true });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const value = JSON.parse(message.value.toString());
        await handler(value);
      },
    });
  }

  // Gửi message tới Kafka
  async sendMessage(topic: string, message: any) {
    try {
      return await this.kafkaClient.emit(topic, message);
    } catch (error) {
      this.logger.error(`Error sending message to topic ${topic}:`, error);
      throw error;
    }
  }

  // Xử lý các message từ Kafka
  async handleBookingCreated(data: any) {
    try {
      this.logger.log('Received booking created event:', data);
      // Implement your booking created logic here
    } catch (error) {
      this.logger.error('Error handling booking created event:', error);
      throw error;
    }
  }

  async handleBookingUpdated(data: any) {
    try {
      this.logger.log('Received booking updated event:', data);
      // Implement your booking updated logic here
    } catch (error) {
      this.logger.error('Error handling booking updated event:', error);
      throw error;
    }
  }

  async handlePaymentProcessed(data: any) {
    try {
      this.logger.log('Received payment processed event:', data);
      // Implement your payment processed logic here
    } catch (error) {
      this.logger.error('Error handling payment processed event:', error);
      throw error;
    }
  }

  // Thêm các phương thức xử lý khác nếu cần
} 