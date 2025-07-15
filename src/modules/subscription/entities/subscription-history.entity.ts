import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Subscription } from './subscription.entity';
import { SubscriptionHistoryAction } from '../../../constants/subscription.enum';
import { PayerType } from '../../../constants/payment.enum';

@Entity('subscription_history')
export class SubscriptionHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Subscription, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;

  @Column({ type: 'uuid', name: 'subscription_id' })
  subscriptionId: string;

  @Column({ type: 'enum', enum: SubscriptionHistoryAction })
  action: SubscriptionHistoryAction;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // Lưu thông tin bổ sung như amount, paymentId, oldEndDate, newEndDate, etc.

  @Column({
    type: 'enum',
    enum: PayerType,
    default: PayerType.CUSTOMER,
    name: 'payer_type'
  })
  payerType: PayerType;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
} 