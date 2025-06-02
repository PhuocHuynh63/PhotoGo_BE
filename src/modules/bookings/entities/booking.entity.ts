import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { ServiceConcept } from '../../service-package/entities/service-concept.entity';
import { BookingHistory } from './booking-history.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Dispute } from '../../disputes/entities/dispute.entity';
import { BookingStatus, BookingSourceType, BookingDepositType } from '../../../constants/booking.enum';

@Entity('booking')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => Vendor, { nullable: false })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ type: 'uuid', name: 'vendor_id' })
  vendorId: string;

  @ManyToOne(() => ServiceConcept, { nullable: false })
  @JoinColumn({ name: 'service_concept_id' })
  serviceConcept: ServiceConcept;

  @Column({ type: 'uuid', name: 'service_concept_id' })
  serviceConceptId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'time' })
  time: string;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ type: 'enum', enum: BookingSourceType, nullable: false, name: 'source_type' })
  sourceType: BookingSourceType;

  @Column({ type: 'uuid', nullable: true, name: 'source_id' })
  sourceId: string;

  @Column({ type: 'integer', nullable: true, name: 'deposit_amount' })
  depositAmount: number;

  @Column({ type: 'enum', enum: BookingDepositType, default: BookingDepositType.PERCENTAGE, nullable: false, name: 'deposit_type' })
  depositType: BookingDepositType;

  @Column({ type: 'text', nullable: true, name: 'user_note' })
  userNote: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'fullname' })
  fullname: string;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'phone' })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'email' })
  email: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => BookingHistory, (history) => history.booking)
  histories: BookingHistory[];

  @OneToMany(() => Invoice, (invoice) => invoice.booking)
  invoices: Invoice[];

  @OneToMany(() => Dispute, (dispute) => dispute.booking)
  disputes: Dispute[];
}