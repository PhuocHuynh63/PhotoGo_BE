import { Module } from '@nestjs/common';
import { OverviewController } from './overview.controller';
import { OverviewService } from './overview.service';
import { PaymentModule } from '../payments/payment.module';
import { InvoiceModule } from '../invoices/invoice.module';
import { BookingModule } from '../bookings/booking.module';
import { CommissionModule } from '../commission/commission.module';

@Module({
  imports: [
    PaymentModule,
    InvoiceModule,
    BookingModule,
    CommissionModule,
  ],
  controllers: [OverviewController],
  providers: [OverviewService],
  exports: [OverviewService],
})
export class OverviewModule {} 