import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { Booking } from './entities/booking.entity';
import { BookingHistory } from './entities/booking-history.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Refund } from '../refunds/entities/refund.entity';
import { RefundHistory } from '../refunds/entities/refund-history.entity';
import { Dispute } from '../disputes/entities/dispute.entity'; // Adjust the import path as necessary
import { ServicePackageModule } from '../service-package/service-package.module';
import { ServicePackage } from '../service-package/entities/service-package.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingHistory,
      Invoice,
      Payment,
      Refund,
      RefundHistory,
      Dispute,
      ServicePackage,
    ]),
    ServicePackageModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}