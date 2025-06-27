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
import { LocationAvailabilityModule } from '../locations/location-availability.module';
import { LocationSlotTimeWorkingDate } from '../locations/entities/location-slot-time-working-date.entity';
import { LocationWorkingDate } from '../locations/entities/location-workingdate.entity';
import { Location } from '../locations/entities/location.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { CampaignVoucher } from '../campaign/entities/campaign-voucher.entity';
import { VoucherUser } from '../vouchers/entities/voucher-user.entity';
import { MailModule } from '../../3rdService/mail/mail.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingHistory,
      ServiceConcept,
      Voucher,
      Dispute,
      Location,
      LocationSlotTimeWorkingDate,
      LocationWorkingDate,
      Invoice,
      CampaignVoucher,
      VoucherUser,
    ]),
    ServicePackageModule,
    VoucherModule,
    forwardRef(() => PaymentModule),
    InvoiceModule,
    LocationAvailabilityModule,
    MailModule,
    AuthModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}