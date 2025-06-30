import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CampaignTrigger } from './campaign-trigger.entity';
import { CampaignCondition } from './campaign-condition.entity';
import { CampaignAction } from './campaign-action.entity';

export enum CampaignStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
}

export enum CampaignType {
  WELCOME = 'welcome',
  BIRTHDAY = 'birthday',
  HOLIDAY = 'holiday',
  PURCHASE = 'purchase',
  CUSTOM = 'custom',
}

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @Column({
    type: 'enum',
    enum: CampaignType,
    default: CampaignType.CUSTOM,
  })
  type: CampaignType;

  @Column({ type: 'datetime', nullable: true })
  startDate: Date;

  @Column({ type: 'datetime', nullable: true })
  endDate: Date;

  @Column({ type: 'int', default: 0 })
  maxRedemptions: number;

  @Column({ type: 'int', default: 0 })
  currentRedemptions: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => CampaignTrigger, (trigger) => trigger.campaign, {
    cascade: true,
  })
  triggers: CampaignTrigger[];

  @OneToMany(() => CampaignCondition, (condition) => condition.campaign, {
    cascade: true,
  })
  conditions: CampaignCondition[];

  @OneToMany(() => CampaignAction, (action) => action.campaign, {
    cascade: true,
  })
  actions: CampaignAction[];
} 