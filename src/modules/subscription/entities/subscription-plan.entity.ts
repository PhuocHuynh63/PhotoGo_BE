import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { SubscriptionVendor } from './subscription-vendor.entity';
import { Subscription } from './subscription.entity';
import { BillingCycle, PlanType } from 'src/constants/subscription.enum';

@Entity('subscription_plan')
export class SubscriptionPlan {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceForMonth: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceForYear: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'enum', enum: PlanType })
  planType: PlanType;

  @Column({ type: 'enum', enum: BillingCycle })
  billingCycle: BillingCycle;

  @OneToMany(() => SubscriptionVendor, subscriptionVendor => subscriptionVendor.plan)
  subscriptionVendors: SubscriptionVendor[];

  @OneToMany(() => Subscription, subscription => subscription.plan)
  subscriptions: Subscription[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
} 