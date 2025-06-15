import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Location } from './location.entity';
import { LocationWorkingDate } from './location-workingdate.entity';
import { LocationSlotTime } from './location-slot-time.entity';

@Entity('location_availability')
export class LocationAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Location, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ type: 'time', nullable: false })
  startTime: string;

  @Column({ type: 'time', nullable: false })
  endTime: string;

  @Column({ type: 'boolean', default: true, nullable: false })
  isAvailable: boolean;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @OneToMany(() => LocationWorkingDate, (workingDate) => workingDate.locationAvailability)
  workingDates: LocationWorkingDate[];

  @OneToMany(() => LocationSlotTime, (slotTime) => slotTime.locationAvailability)
  slotTimes: LocationSlotTime[];
} 