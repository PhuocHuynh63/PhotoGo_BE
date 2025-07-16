import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { RefundHistory } from './refund-history.entity';

import { RefundStatus } from '../../../constants/booking.enum';

@Entity('refund')
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.refunds, { nullable: false })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ type: 'uuid', name: 'invoice_id' })
  invoiceId: string;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: RefundStatus, default: RefundStatus.PENDING })
  status: RefundStatus;

  @Column({ type: 'jsonb', nullable: true, name: 'transaction_details' })
  transactionDetails: {
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;
    transferId?: string;
    transferTime?: string;
    paymentMethod?: string;
    paymentId?: string;
  };

  @Column({ type: 'jsonb', nullable: true, name: 'manual_refund_details' })
  manualRefundDetails: {
    refundMethod?: string;
    refundAmount?: number;
    refundNote?: string;
    refundedAt?: string;
    refundedBy?: string;
    bankAccount?: string;
    bankName?: string;
  };

  @Column({ type: 'uuid', nullable: true, name: 'payment_id' })
  paymentId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => RefundHistory, (history) => history.refund)
  histories: RefundHistory[];
}