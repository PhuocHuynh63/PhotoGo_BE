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

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'price_for_month' })
  priceForMonth: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'price_for_year' })
  priceForYear: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'enum', enum: PlanType, name: 'plan_type' })
  planType: PlanType;

  @Column({ type: 'enum', enum: BillingCycle, name: 'billing_cycle' })
  billingCycle: BillingCycle;

  @Column({ type: 'int', name: 'duration', default: 30 })
  duration: number;

  @OneToMany(() => SubscriptionVendor, subscriptionVendor => subscriptionVendor.plan)
  subscriptionVendors: SubscriptionVendor[];

  @OneToMany(() => Subscription, subscription => subscription.plan)
  subscriptions: Subscription[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
} 