import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPlanController } from './subscription-plan.controller';
import { SubscriptionInvoice } from './entities/subscription-invoice.entity';
import { SubscriptionPayment } from './entities/subscription-payment.entity';
import { SubscriptionHistory } from './entities/subscription-history.entity';
import { SubscriptionPaymentService } from './subscription-payment.service';
import { SubscriptionHistoryService } from './subscription-history.service';
import { PayosModule } from '../../3rdService/payos/payos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscription,
      SubscriptionPlan,
      SubscriptionInvoice,
      SubscriptionPayment,
      SubscriptionHistory
    ]),
    PayosModule
  ],
  controllers: [SubscriptionController, SubscriptionPlanController],
  providers: [
    SubscriptionService,
    SubscriptionPlanService,
    SubscriptionPaymentService,
    SubscriptionHistoryService
  ],
  exports: [SubscriptionService, SubscriptionPlanService, SubscriptionPaymentService, SubscriptionHistoryService]
})
export class SubscriptionModule {} 