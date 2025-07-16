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

export enum TriggerType {
  USER_REGISTERED = 'user_registered',
  USER_BIRTHDAY = 'user_birthday',
  ORDER_COMPLETED = 'order_completed',
  FIRST_PURCHASE = 'first_purchase',
  TOTAL_SPENT = 'total_spent',
  HOLIDAY_EVENT = 'holiday_event',
  CUSTOM_EVENT = 'custom_event',
}

@Entity('campaign_triggers')
export class CampaignTrigger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  campaignId: string;

  @Column({
    type: 'enum',
    enum: TriggerType,
  })
  triggerType: TriggerType;

  @Column({ type: 'json', nullable: true })
  triggerConfig: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Campaign, (campaign) => campaign.triggers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;
} 