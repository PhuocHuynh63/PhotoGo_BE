import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignEngineController } from './campaign-engine.controller';
import { CampaignEngineService } from './campaign-engine.service';
import { CampaignRuleService } from './services/campaign-rule.service';
import { ConditionHandlerService } from './services/condition-handler.service';
import { ActionHandlerService } from './services/action-handler.service';
import { Campaign } from './entities/campaign.entity';
import { CampaignTrigger } from './entities/campaign-trigger.entity';
import { CampaignCondition } from './entities/campaign-condition.entity';
import { CampaignAction } from './entities/campaign-action.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Campaign,
      CampaignTrigger,
      CampaignCondition,
      CampaignAction,
    ]),
  ],
  controllers: [CampaignEngineController],
  providers: [
    CampaignEngineService,
    CampaignRuleService,
    ConditionHandlerService,
    ActionHandlerService,
  ],
  exports: [CampaignEngineService],
})
export class CampaignEngineModule {} 