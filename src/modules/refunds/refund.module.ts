import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Refund } from './entities/refund.entity';
import { RefundHistory } from './entities/refund-history.entity';
import { RefundService } from './refund.service';
import { RefundController } from './refund.controller';
import { PaymentModule } from '../payments/payment.module';
import { PayosModule } from '../../3rdService/payos/payos.module';
import { MailModule } from '../../3rdService/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Refund, RefundHistory]),
    forwardRef(() => PaymentModule),
    PayosModule,
    MailModule,
  ],
  controllers: [RefundController],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}