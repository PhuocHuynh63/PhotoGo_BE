import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPlanController } from './subscription-plan.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionPlan])],
  providers: [SubscriptionPlanService],
  controllers: [SubscriptionPlanController],
  exports: [SubscriptionPlanService],
})
export class SubscriptionPlanModule {}