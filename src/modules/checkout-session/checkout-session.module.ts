import { Module } from '@nestjs/common';
import { CheckoutSessionController } from './checkout-session.controller';
import { CheckoutSessionService } from './checkout-session.service';
import { RedisModule } from 'src/3rdService/redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [CheckoutSessionController],
  providers: [CheckoutSessionService],
  exports: [CheckoutSessionService],
})
export class CheckoutSessionModule {} 