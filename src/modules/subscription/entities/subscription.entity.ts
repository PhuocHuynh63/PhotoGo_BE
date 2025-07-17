import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SubscriptionPlan } from './subscription-plan.entity';
import { SubscriptionStatus, BillingCycle } from '../../../constants/subscription.enum';
import { SubscriptionInvoice } from './subscription-invoice.entity';
import { SubscriptionHistory } from './subscription-history.entity';

@Entity('subscription')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId: string;

  @ManyToOne(() => SubscriptionPlan, { nullable: false })
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Column({ type: 'uuid', name: 'plan_id' })
  planId: string;

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE
  })
  status: SubscriptionStatus;

  @Column({
    type: 'enum',
    enum: BillingCycle,
    default: BillingCycle.MONTHLY
  })
  billingCycle: BillingCycle;

  //triggerCode

  @Column({ type: 'timestamptz', name: 'last_billed_at', nullable: true })
  lastBilledAt: Date;

  @Column({ type: 'timestamptz', name: 'next_billing_at', nullable: true })
  nextBillingAt: Date;

  @OneToMany(() => SubscriptionInvoice, invoice => invoice.subscription)
  invoices: SubscriptionInvoice[];

  @OneToMany(() => SubscriptionHistory, history => history.subscription)
  history: SubscriptionHistory[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
} 