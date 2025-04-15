import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { InvoiceStatus } from 'src/constants/booking.enum';
import { Payment } from '../../payments/entities/payment.entity';
import { Refund } from '../../refunds/entities/refund.entity';



@Entity('invoice')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Booking, (booking) => booking.invoices, { nullable: false })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId: string;

  @Column({ type: 'integer', default: 0 })
  originalPrice: number;

  @Column({ type: 'integer', default: 0 })
  discountAmount: number;

  @Column({ type: 'integer', default: 0 })
  discountedPrice: number;

  @Column({ type: 'integer', default: 0 })
  taxAmount: number;

  @Column({ type: 'integer', default: 0 })
  feeAmount: number;

  @Column({ type: 'integer', default: 0 })
  payablePrice: number;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.PENDING })
  status: InvoiceStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  issuedAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Payment, (payment) => payment.invoice)
  payments: Payment[];

  @OneToMany(() => Refund, (refund) => refund.invoice)
  refunds: Refund[];
}