import { Injectable, Logger } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from 'src/app.module';

@Injectable()
export class RabbitmqConsumerService {
    private readonly logger = new Logger(RabbitmqConsumerService.name);
    private queues = ['order'];

    constructor(private readonly configService: ConfigService) { }

    async listen() {
        for (const queue of this.queues) {
            const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
                transport: Transport.RMQ,
                options: {
                    urls: [this.configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672'],
                    queue,
                    queueOptions: { durable: true },
                },
            });

            await app.listen();
            this.logger.log(`✅ RabbitMQ Consumer is listening on queue: ${queue}`);
        }
    }
}