import { RmqOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

export const rabbitMQConfig = (configService: ConfigService, queue: string): RmqOptions => ({
    transport: Transport.RMQ,
    options: {
        urls: [configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672'],
        queue,
        queueOptions: { durable: true },
        prefetchCount: 1,
    },
});