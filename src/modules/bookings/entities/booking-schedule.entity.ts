import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Booking } from './booking.entity';
import { BookingScheduleStatus } from '../../../constants/booking.enum';

@Entity('booking_schedule')
export class BookingSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Booking, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'enum', enum: BookingScheduleStatus, default: BookingScheduleStatus.SCHEDULED })
  status: BookingScheduleStatus;

  @Column({ type: 'text', nullable: true, name: 'postpone_reason' })
  postponeReason: string;

  @Column({ type: 'date', nullable: true, name: 'postponed_to_date' })
  postponedToDate: Date;

  @Column({ type: 'text', nullable: true, name: 'notes' })
  notes: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
} 