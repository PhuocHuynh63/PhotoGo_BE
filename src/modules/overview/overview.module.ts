import { Module } from '@nestjs/common';
import { OverviewController } from './overview.controller';
import { OverviewService } from './overview.service';
import { PaymentModule } from '../payments/payment.module';
import { InvoiceModule } from '../invoices/invoice.module';
import { BookingModule } from '../bookings/booking.module';
import { CommissionModule } from '../commission/commission.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { VendorModule } from '../vendors/vendor.module';

@Module({
  imports: [
    PaymentModule,
    InvoiceModule,
    BookingModule,
    CommissionModule,
    SubscriptionModule,
    VendorModule,
  ],
  controllers: [OverviewController],
  providers: [OverviewService],
  exports: [OverviewService],
})
export class OverviewModule {} 