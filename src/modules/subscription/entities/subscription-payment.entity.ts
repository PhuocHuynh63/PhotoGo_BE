import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { SubscriptionInvoice } from './subscription-invoice.entity';
import { PaymentMethod, PaymentStatus, PaymentSubscriptionType, PayerType } from '../../../constants/payment.enum';

@Entity('subscription_payment')
export class SubscriptionPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SubscriptionInvoice, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_invoice_id' })
  subscriptionInvoice: SubscriptionInvoice;

  @Column({ type: 'uuid', name: 'subscription_invoice_id' })
  subscriptionInvoiceId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'paymentos_id' })
  paymentOSId: string;

  @Column({ type: 'enum', enum: PaymentMethod, name: 'payment_method' })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentSubscriptionType, default: PaymentSubscriptionType.FULL_PAYMENT })
  type: PaymentSubscriptionType;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'transaction_id' })
  transactionId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PayerType,
    default: PayerType.CUSTOMER,
    name: 'payer_type'
  })
  payerType: PayerType;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
} 