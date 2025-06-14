import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Campaign } from './campaign.entity';
import { Voucher } from '../../vouchers/entities/voucher.entity';

@Entity('campaign_voucher')
export class CampaignVoucher {
  @PrimaryColumn('uuid')
  campaignId: string;

  @PrimaryColumn('uuid')
  voucherId: string;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;

  @Column({ type: 'boolean', default: true, name: 'isavailable' })
  isAvailable: boolean;

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();

  @ManyToOne(() => Campaign, campaign => campaign.campaignVouchers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @ManyToOne(() => Voucher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voucher_id' })
  voucher: Voucher;
} 