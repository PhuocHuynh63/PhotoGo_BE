import { Injectable } from '@nestjs/common';
import { CampaignRuleService, CampaignEvent } from './services/campaign-rule.service';
import { TriggerType } from './entities/campaign-trigger.entity';

@Injectable()
export class CampaignEngineService {
  constructor(private campaignRuleService: CampaignRuleService) {}

  /**
   * Process a campaign event
   * This is the main entry point for the campaign engine
   */
  async processEvent(event: CampaignEvent): Promise<void> {
    await this.campaignRuleService.processEvent(event);
  }

  /**
   * Trigger user registration event
   */
  async onUserRegistered(userId: string, userData?: any): Promise<void> {
    const event: CampaignEvent = {
      eventType: TriggerType.USER_REGISTERED,
      userId,
      userData,
    };
    await this.processEvent(event);
  }

  /**
   * Trigger user birthday event
   */
  async onUserBirthday(userId: string, userData?: any): Promise<void> {
    const event: CampaignEvent = {
      eventType: TriggerType.USER_BIRTHDAY,
      userId,
      userData,
    };
    await this.processEvent(event);
  }

  /**
   * Trigger order completed event
   */
  async onOrderCompleted(userId: string, orderData?: any): Promise<void> {
    const event: CampaignEvent = {
      eventType: TriggerType.ORDER_COMPLETED,
      userId,
      orderData,
    };
    await this.processEvent(event);
  }

  /**
   * Trigger first purchase event
   */
  async onFirstPurchase(userId: string, orderData?: any): Promise<void> {
    const event: CampaignEvent = {
      eventType: TriggerType.FIRST_PURCHASE,
      userId,
      orderData,
    };
    await this.processEvent(event);
  }

  /**
   * Trigger total spent event
   */
  async onTotalSpent(userId: string, orderData?: any): Promise<void> {
    const event: CampaignEvent = {
      eventType: TriggerType.TOTAL_SPENT,
      userId,
      orderData,
    };
    await this.processEvent(event);
  }

  /**
   * Trigger holiday event
   */
  async onHolidayEvent(userId: string, eventData?: any): Promise<void> {
    const event: CampaignEvent = {
      eventType: TriggerType.HOLIDAY_EVENT,
      userId,
      eventData,
    };
    await this.processEvent(event);
  }

  /**
   * Trigger custom event
   */
  async onCustomEvent(userId: string, eventData?: any): Promise<void> {
    const event: CampaignEvent = {
      eventType: TriggerType.CUSTOM_EVENT,
      userId,
      eventData,
    };
    await this.processEvent(event);
  }

  /**
   * Manually trigger a specific campaign
   */
  async triggerCampaign(campaignId: string, event: CampaignEvent): Promise<void> {
    await this.campaignRuleService.triggerCampaign(campaignId, event);
  }
} 