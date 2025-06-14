import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Campaign } from './campaign.entity';
import { User } from '../../users/entities/user.entity';

@Entity('user_campaign')
export class UserCampaign {
  @PrimaryColumn('uuid')
  userId: string;

  @PrimaryColumn('uuid')
  campaignId: string;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @Column({ type: 'boolean', default: true, name: 'isavailable' })
  isAvailable: boolean;

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Campaign, campaign => campaign.userCampaigns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;
} 