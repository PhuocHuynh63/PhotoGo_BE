import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { LocationSlotTime } from './location-slot-time.entity';
import { LocationWorkingDate } from './location-workingdate.entity';

@Entity('location_slot_time_working_dates')
export class LocationSlotTimeWorkingDate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'slot_time_id' })
  slotTimeId: string;

  @Column({ name: 'working_date_id' })
  workingDateId: string;

  @Column({ name: 'max_parallel_bookings', default: 1 })
  maxParallelBookings: number;

  @ManyToOne(() => LocationSlotTime)
  @JoinColumn({ name: 'slot_time_id' })
  slotTime: LocationSlotTime;

  @ManyToOne(() => LocationWorkingDate)
  @JoinColumn({ name: 'working_date_id' })
  workingDate: LocationWorkingDate;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
} 