import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PayosModule } from '../../3rdService/payos/payos.module';
import { InvoiceModule } from '../invoices/invoice.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), InvoiceModule, PayosModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}