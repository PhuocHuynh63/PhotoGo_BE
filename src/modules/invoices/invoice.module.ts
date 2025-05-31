import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { BookingModule } from '../bookings/booking.module';
import { ServicePackageModule } from '../service-package/service-package.module';
import { VoucherModule } from '../vouchers/voucher.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentModule } from '../payments/payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice]),
    BookingModule,
    ServicePackageModule,
    VoucherModule,
    AuthModule,
    PaymentModule,
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}