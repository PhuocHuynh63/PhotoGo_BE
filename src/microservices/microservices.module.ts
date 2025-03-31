import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { rabbitMQConfig } from 'src/configs/rabbitmq.config';

@Module({
    imports: [
        ConfigModule,
        ClientsModule.registerAsync([
            {
                name: 'RABBITMQ_SERVICE',
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: (configService: ConfigService) => rabbitMQConfig(configService, 'pooltable_queue'),
            },
        ]),
    ],
    exports: [ClientsModule],
})
export class MicroservicesModule { }