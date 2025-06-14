import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CampaignVoucher } from './campaign-voucher.entity';
import { UserCampaign } from './user-campaign.entity';

@Entity('campaign')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'boolean', default: true })
  status: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => CampaignVoucher, campaignVoucher => campaignVoucher.campaign)
  campaignVouchers: CampaignVoucher[];

  @OneToMany(() => UserCampaign, userCampaign => userCampaign.campaign)
  userCampaigns: UserCampaign[];
} 