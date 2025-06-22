import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { LocationAvailability } from './location-availability.entity';
import { LocationSlotTimeWorkingDate } from './location-slot-time-working-date.entity';

@Entity('location_slot_time')
export class LocationSlotTime {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'location_availability_id', type: 'uuid' })
  locationAvailabilityId: string;

  @Column({ type: 'integer' })
  slot: number;

  @Column({ name: 'start_slot_time', type: 'time' })
  startSlotTime: string;

  @Column({ name: 'end_slot_time', type: 'time' })
  endSlotTime: string;

  @Column({ name: 'is_strict_time_blocking', type: 'boolean', default: true })
  isStrictTimeBlocking: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @ManyToOne(() => LocationAvailability, (availability) => availability.slotTimes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'location_availability_id' })
  locationAvailability: LocationAvailability;

  @OneToMany(() => LocationSlotTimeWorkingDate, (slotTimeWorkingDate) => slotTimeWorkingDate.slotTime)
  locationSlotTimeWorkingDates: LocationSlotTimeWorkingDate[];
} 