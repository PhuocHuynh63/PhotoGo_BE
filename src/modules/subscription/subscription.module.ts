import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SubscriptionVendor } from './entities/subscription-vendor.entity';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPlanController } from './subscription-plan.controller';
import { SubscriptionVendorService } from './subscription-vendor.service';
import { SubscriptionVendorController } from './subscription-vendor.controller';
import { SubscriptionInvoice } from './entities/subscription-invoice.entity';
import { SubscriptionPayment } from './entities/subscription-payment.entity';
import { SubscriptionHistory } from './entities/subscription-history.entity';
import { SubscriptionPaymentService } from './subscription-payment.service';
import { SubscriptionHistoryService } from './subscription-history.service';
import { PayosModule } from '../../3rdService/payos/payos.module';
import { MailModule } from '../../3rdService/mail/mail.module';
import { UserModule } from '../users/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscription,
      SubscriptionPlan,
      SubscriptionVendor,
      SubscriptionInvoice,
      SubscriptionPayment,
      SubscriptionHistory
    ]),
    PayosModule,
    MailModule,
    UserModule
  ],
  controllers: [SubscriptionController, SubscriptionPlanController, SubscriptionVendorController],
  providers: [
    SubscriptionService,
    SubscriptionPlanService,
    SubscriptionVendorService,
    SubscriptionPaymentService,
    SubscriptionHistoryService
  ],
  exports: [SubscriptionService, SubscriptionPlanService, SubscriptionVendorService, SubscriptionPaymentService, SubscriptionHistoryService]
})
export class SubscriptionModule {} 