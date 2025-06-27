import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { SubscriptionInvoice } from './subscription-invoice.entity';
import { PaymentMethod, PaymentStatus, PaymentType } from '../../../constants/payment.enum';

@Entity('subscription_payment')
export class SubscriptionPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SubscriptionInvoice, { nullable: false })
  @JoinColumn({ name: 'subscription_invoice_id' })
  subscriptionInvoice: SubscriptionInvoice;

  @Column({ type: 'uuid', name: 'subscription_invoice_id' })
  subscriptionInvoiceId: string;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'paymentos_id' })
  paymentOSId: string;

  @Column({ type: 'enum', enum: PaymentMethod, name: 'payment_method' })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentType, default: PaymentType.DEPOSIT })
  type: PaymentType;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'transaction_id' })
  transactionId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
} 