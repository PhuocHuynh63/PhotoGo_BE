import { Module } from '@nestjs/common';
import { RabbitmqController } from './rabbitmq.controller';
import { MicroservicesModule } from '../microservices.module';
import { RabbitmqService } from './rabbitmq.service';


@Module({
    imports: [MicroservicesModule],
    controllers: [RabbitmqController],
    providers: [RabbitmqService],
    exports: [RabbitmqService],
})
export class RabbitmqModule { }