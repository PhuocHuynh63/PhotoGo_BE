import { Module, forwardRef } from '@nestjs/common';
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
import { Point } from '../points/entities/point.entity';
import { PointTransaction } from '../points/entities/point-transaction.entity';
import { MailModule } from 'src/3rdService/mail/mail.module';
import { BookingModule } from '../bookings/booking.module';
import { RefundModule } from '../refunds/refund.module';
import { LocationAvailabilityModule } from '../locations/location-availability.module';
import { Voucher } from '../vouchers/entities/voucher.entity';
import { LocationWorkingDate } from '../locations/entities/location-workingdate.entity';
import { Album } from '../album/entities/album.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Invoice, Booking, BookingHistory, Point, PointTransaction, Voucher, LocationWorkingDate, Album]),
    VoucherModule,
    PayosModule,
    AuthModule,
    MailModule,
    forwardRef(() => BookingModule),
    forwardRef(() => RefundModule),
    LocationAvailabilityModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}