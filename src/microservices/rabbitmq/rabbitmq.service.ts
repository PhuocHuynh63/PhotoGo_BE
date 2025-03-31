import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class RabbitmqService {
    private readonly logger = new Logger(RabbitmqService.name);
    constructor(@Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy) { }

    emit<T>(pattern: string, data: T, queue?: string) {
        this.logger.log(`Emitting to pattern: ${pattern} with data: ${JSON.stringify(data)}`);
        return this.client.emit(pattern, data);
    }

    async connect() {
        try {
            await this.client.connect();
            this.logger.log('Connected to RabbitMQ');
        } catch (error) {
            this.logger.error('Failed to connect to RabbitMQ', error);
            throw error;
        }
    }

    close() {
        this.client.close();
        this.logger.log('RabbitMQ connection closed');
    }
} 