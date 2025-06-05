import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { Booking } from './entities/booking.entity';
import { BookingHistory } from './entities/booking-history.entity';
import { ServiceConcept } from '../service-package/entities/service-concept.entity';
import { Voucher } from '../vouchers/entities/voucher.entity';
import { ServicePackageModule } from '../service-package/service-package.module';
import { VoucherModule } from '../vouchers/voucher.module';
import { PaymentModule } from '../payments/payment.module';
import { InvoiceModule } from '../invoices/invoice.module';
import { Dispute } from '../disputes/entities/dispute.entity';
import { KafkaModule } from '../../3rdService/kafka/kafka.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingHistory,
      ServiceConcept,
      Voucher,
      Dispute,
    ]),
    ServicePackageModule,
    VoucherModule,
    PaymentModule,
    InvoiceModule,
    KafkaModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}