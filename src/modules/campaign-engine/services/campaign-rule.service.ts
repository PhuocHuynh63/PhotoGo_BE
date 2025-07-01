import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign, CampaignStatus } from '../entities/campaign.entity';
import { CampaignTrigger, TriggerType } from '../entities/campaign-trigger.entity';
import { ConditionHandlerService, ConditionContext } from './condition-handler.service';
import { ActionHandlerService, ActionContext } from './action-handler.service';

export interface CampaignEvent {
  eventType: TriggerType;
  userId: string;
  userData?: any;
  orderData?: any;
  eventData?: any;
}

@Injectable()
export class CampaignRuleService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignTrigger)
    private triggerRepository: Repository<CampaignTrigger>,
    private conditionHandler: ConditionHandlerService,
    private actionHandler: ActionHandlerService,
  ) {}

  async processEvent(event: CampaignEvent): Promise<void> {
    try {
      console.log(`Processing event: ${event.eventType} for user: ${event.userId}`);

      // 1. Find all active campaigns that match this event type
      const matchingCampaigns = await this.findMatchingCampaigns(event.eventType);

      if (matchingCampaigns.length === 0) {
        console.log(`No matching campaigns found for event: ${event.eventType}`);
        return;
      }

      // 2. Process each matching campaign
      for (const campaign of matchingCampaigns) {
        await this.processCampaign(campaign, event);
      }
    } catch (error) {
      console.error('Error processing campaign event:', error);
    }
  }

  private async findMatchingCampaigns(eventType: TriggerType): Promise<Campaign[]> {
    const now = new Date();

    return await this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.triggers', 'triggers')
      .leftJoinAndSelect('campaign.conditions', 'conditions')
      .leftJoinAndSelect('campaign.actions', 'actions')
      .where('campaign.isActive = :isActive', { isActive: true })
      .andWhere('campaign.status = :status', { status: CampaignStatus.ACTIVE })
      .andWhere('triggers.triggerType = :eventType', { eventType })
      .andWhere('triggers.isActive = :triggerActive', { triggerActive: true })
      .andWhere('(campaign.startDate IS NULL OR campaign.startDate <= :now)', { now })
      .andWhere('(campaign.endDate IS NULL OR campaign.endDate >= :now)', { now })
      .andWhere('(campaign.maxRedemptions = 0 OR campaign.currentRedemptions < campaign.maxRedemptions)')
      .orderBy('campaign.priority', 'DESC')
      .addOrderBy('campaign.createdAt', 'ASC')
      .getMany();
  }

  private async processCampaign(campaign: Campaign, event: CampaignEvent): Promise<void> {
    try {
      console.log(`Processing campaign: ${campaign.name} (${campaign.id})`);

      // 1. Check if user has already redeemed this campaign
      if (await this.hasUserRedeemedCampaign(campaign.id, event.userId)) {
        console.log(`User ${event.userId} has already redeemed campaign ${campaign.id}`);
        return;
      }

      // 2. Evaluate all conditions
      const conditionContext: ConditionContext = {
        userId: event.userId,
        userData: event.userData,
        orderData: event.orderData,
        eventData: event.eventData,
      };

      const conditionsMet = await this.evaluateConditions(campaign.conditions, conditionContext);

      if (!conditionsMet) {
        console.log(`Conditions not met for campaign ${campaign.id}`);
        return;
      }

      // 3. Execute all actions
      const actionContext: ActionContext = {
        userId: event.userId,
        campaignId: campaign.id,
        userData: event.userData,
        orderData: event.orderData,
        eventData: event.eventData,
      };

      const actionsExecuted = await this.executeActions(campaign.actions, actionContext);

      if (actionsExecuted) {
        // 4. Record campaign redemption
        await this.recordCampaignRedemption(campaign.id, event.userId);
        console.log(`Campaign ${campaign.id} successfully processed for user ${event.userId}`);
      }
    } catch (error) {
      console.error(`Error processing campaign ${campaign.id}:`, error);
    }
  }

  private async evaluateConditions(
    conditions: any[],
    context: ConditionContext,
  ): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return true; // No conditions means always true
    }

    // Sort conditions by priority
    const sortedConditions = conditions
      .filter(condition => condition.isActive)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // All conditions must be met (AND logic)
    for (const condition of sortedConditions) {
      const conditionMet = await this.conditionHandler.evaluateCondition(condition, context);
      if (!conditionMet) {
        console.log(`Condition ${condition.conditionType} not met`);
        return false;
      }
    }

    return true;
  }

  private async executeActions(
    actions: any[],
    context: ActionContext,
  ): Promise<boolean> {
    if (!actions || actions.length === 0) {
      return false; // No actions to execute
    }

    // Sort actions by priority
    const sortedActions = actions
      .filter(action => action.isActive)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    let allActionsExecuted = true;

    // Execute all actions
    for (const action of sortedActions) {
      try {
        const actionExecuted = await this.actionHandler.executeAction(action, context);
        if (!actionExecuted) {
          console.warn(`Action ${action.actionType} failed to execute`);
          allActionsExecuted = false;
        }
      } catch (error) {
        console.error(`Error executing action ${action.actionType}:`, error);
        allActionsExecuted = false;
      }
    }

    return allActionsExecuted;
  }

  private async hasUserRedeemedCampaign(campaignId: string, userId: string): Promise<boolean> {
    // TODO: Implement check if user has already redeemed this campaign
    // This could be a separate table or a field in the campaign entity
    console.log(`Checking if user ${userId} has redeemed campaign ${campaignId}`);
    return false; // Placeholder
  }

  private async recordCampaignRedemption(campaignId: string, userId: string): Promise<void> {
    try {
      // 1. Increment current redemptions count
      await this.campaignRepository
        .createQueryBuilder()
        .update(Campaign)
        .set({
          currentRedemptions: () => 'currentRedemptions + 1',
        })
        .where('id = :campaignId', { campaignId })
        .execute();

      // 2. TODO: Record redemption in campaign_redemptions table
      console.log(`Recorded redemption for campaign ${campaignId} by user ${userId}`);
    } catch (error) {
      console.error('Error recording campaign redemption:', error);
    }
  }

  // Helper method to manually trigger a campaign (for testing)
  async triggerCampaign(campaignId: string, event: CampaignEvent): Promise<void> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
      relations: ['triggers', 'conditions', 'actions'],
    });

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    await this.processCampaign(campaign, event);
  }
} 