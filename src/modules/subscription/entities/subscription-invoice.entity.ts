import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Subscription } from './subscription.entity';
import { SubscriptionInvoiceStatus } from '../../../constants/subscription.enum';
import { PayerType } from '../../../constants/payment.enum';
import { SubscriptionPayment } from './subscription-payment.entity';


@Entity('subscription_invoice')
export class SubscriptionInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Subscription, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;

  @Column({ type: 'uuid', name: 'subscription_id' })
  subscriptionId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  payablePrice: number;

  @Column({ type: 'enum', enum: SubscriptionInvoiceStatus, default: SubscriptionInvoiceStatus.PENDING })
  status: SubscriptionInvoiceStatus;

  @Column({
    type: 'enum',
    enum: PayerType,
    default: PayerType.CUSTOMER,
    name: 'payer_type'
  })
  payerType: PayerType;

  @OneToMany(() => SubscriptionPayment, payment => payment.subscriptionInvoice)
  payments: SubscriptionPayment[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
} 