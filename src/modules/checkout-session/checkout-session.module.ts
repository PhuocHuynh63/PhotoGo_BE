import { Module } from '@nestjs/common';
import { CheckoutSessionController } from './checkout-session.controller';
import { CheckoutSessionService } from './checkout-session.service';
import { RedisModule } from 'src/3rdService/redis/redis.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [RedisModule, TypeOrmModule.forFeature([User])],
  controllers: [CheckoutSessionController],
  providers: [CheckoutSessionService],
  exports: [CheckoutSessionService],
})
export class CheckoutSessionModule {} 