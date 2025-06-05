import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PayosModule } from '../../3rdService/payos/payos.module';
import { Invoice } from '../invoices/entities/invoice.entity';
import { VoucherModule } from '../vouchers/voucher.module';
import { AuthModule } from '../auth/auth.module';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingHistory } from '../bookings/entities/booking-history.entity';
import { KafkaModule } from '../../3rdService/kafka/kafka.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Invoice, Booking, BookingHistory]),
    VoucherModule,
    PayosModule,
    AuthModule,
    KafkaModule
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}