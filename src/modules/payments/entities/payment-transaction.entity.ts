import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Payment } from './payment.entity';
import { PaymentMethod, PaymentStatus, PaymentType } from '../../../constants/payment.enum';

@Entity('payment_transaction')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Payment, { nullable: true })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({ type: 'uuid', name: 'payment_id', nullable: true })
  paymentId: string;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ type: 'enum', enum: PaymentMethod, name: 'payment_method', nullable: true })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, name: 'status', nullable: true })
  status: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentType, name: 'type', nullable: true })
  type: PaymentType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'transaction_id' })
  transactionId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
} 