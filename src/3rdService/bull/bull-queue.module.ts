import { Module, DynamicModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { RedisModule } from '../redis/redis.module';
import { BullQueueService } from './bull-queue.service';
import { ConfigService } from '@nestjs/config';

@Module({})
export class BullQueueModule {
    static forRoot(): DynamicModule {
        return {
            module: BullQueueModule,
            imports: [RedisModule],
            providers: [BullQueueService],
            exports: [BullQueueService],
            global: true,
        };
    }

    static registerQueue(queueName: string, options: any = {}): DynamicModule {
        return {
            module: BullQueueModule,
            imports: [
                RedisModule,
                BullModule.registerQueueAsync({
                    name: queueName,
                    imports: [RedisModule],
                    inject: [ConfigService],
                    useFactory: async (configService: ConfigService) => {
                        const redisUri =
                            configService.get<string>('REDIS_URI')

                        if (!redisUri) {
                            throw new Error('REDIS_URI is not defined in environment variables');
                        }

                        return {
                            redis: {
                                host: new URL(redisUri).hostname,
                                port: parseInt(new URL(redisUri).port),
                                password: new URL(redisUri).password,
                            },
                            ...options,
                        };
                    },
                }),
            ],
            exports: [BullModule],
        };
    }
}
