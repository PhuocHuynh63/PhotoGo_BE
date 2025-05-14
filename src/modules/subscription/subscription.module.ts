import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPlanController } from './subscription-plan.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, SubscriptionPlan])
  ],
  controllers: [SubscriptionController, SubscriptionPlanController],
  providers: [SubscriptionService, SubscriptionPlanService],
  exports: [SubscriptionService, SubscriptionPlanService]
})
export class SubscriptionModule {} 