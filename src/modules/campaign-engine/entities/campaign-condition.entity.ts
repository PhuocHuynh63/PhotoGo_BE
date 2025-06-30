import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Campaign } from './campaign.entity';

export enum ConditionType {
  IS_FIRST_PURCHASE = 'is_first_purchase',
  TOTAL_SPENT_GREATER_THAN = 'total_spent_greater_than',
  USER_AGE_BETWEEN = 'user_age_between',
  USER_REGISTRATION_DATE_AFTER = 'user_registration_date_after',
  USER_HAS_NOT_PURCHASED_IN_DAYS = 'user_has_not_purchased_in_days',
  USER_PURCHASE_COUNT_GREATER_THAN = 'user_purchase_count_greater_than',
  CUSTOM_CONDITION = 'custom_condition',
}

@Entity('campaign_conditions')
export class CampaignCondition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  campaignId: string;

  @Column({
    type: 'enum',
    enum: ConditionType,
  })
  conditionType: ConditionType;

  @Column({ type: 'json', nullable: true })
  conditionConfig: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Campaign, (campaign) => campaign.conditions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;
} 