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
import { VendorModule } from '../vendors/vendor.module';
import { BullQueueModule } from '../../3rdService/bull/bull-queue.module';
import { SubscriptionProcessor } from './bull/subscription.processor';
import { NotificationModule } from '../notifications/notification.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscription,
      SubscriptionPlan,
      SubscriptionVendor,
      SubscriptionInvoice,
      SubscriptionPayment,
      SubscriptionHistory,
      User,
    ]),
    BullQueueModule.registerQueue('subscription-reminders'),
    BullQueueModule.forRoot(),
    PayosModule,
    MailModule,
    UserModule,
    VendorModule,
    NotificationModule,
  ],
  controllers: [SubscriptionController, SubscriptionPlanController, SubscriptionVendorController],
  providers: [
    SubscriptionService,
    SubscriptionPlanService,
    SubscriptionHistoryService,
    SubscriptionPaymentService,
    SubscriptionVendorService,
    SubscriptionHistoryService,
    SubscriptionProcessor,
  ],
  exports: [SubscriptionService, SubscriptionPlanService, SubscriptionVendorService, SubscriptionPaymentService, SubscriptionHistoryService]
})
export class SubscriptionModule { } 