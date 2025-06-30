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

export enum ActionType {
  SEND_VOUCHER = 'send_voucher',
  ADD_POINTS = 'add_points',
  SEND_EMAIL = 'send_email',
  SEND_NOTIFICATION = 'send_notification',
  APPLY_DISCOUNT = 'apply_discount',
  FREE_SHIPPING = 'free_shipping',
  CUSTOM_ACTION = 'custom_action',
}

@Entity('campaign_actions')
export class CampaignAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  campaignId: string;

  @Column({
    type: 'enum',
    enum: ActionType,
  })
  actionType: ActionType;

  @Column({ type: 'json', nullable: true })
  actionConfig: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Campaign, (campaign) => campaign.actions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;
} 