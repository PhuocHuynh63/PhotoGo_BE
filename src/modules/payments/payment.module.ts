import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PayosModule } from '../../3rdService/payos/payos.module';
import { InvoiceModule } from '../invoices/invoice.module';
import { Invoice } from '../invoices/entities/invoice.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment,Invoice]), InvoiceModule, PayosModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [TypeOrmModule],
})
export class PaymentModule {}