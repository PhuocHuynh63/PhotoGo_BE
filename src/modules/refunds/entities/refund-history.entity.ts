import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Refund } from './refund.entity';
import { RefundStatus } from '../../../constants/booking.enum';

@Entity('refund_history')
export class RefundHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Refund, (refund) => refund.histories, { nullable: false })
  @JoinColumn({ name: 'refund_id' })
  refund: Refund;

  @Column({ type: 'uuid', name: 'refund_id' })
  refundId: string;

  @Column({ type: 'enum', enum: RefundStatus })
  status: RefundStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  changedAt: Date;
}