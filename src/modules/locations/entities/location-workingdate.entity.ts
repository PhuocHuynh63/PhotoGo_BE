import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { LocationAvailability } from './location-availability.entity';

@Entity('location_workingdate')
export class LocationWorkingDate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'location_availability_id', type: 'uuid' })
  locationAvailabilityId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'boolean', default: true, name: 'isavailable' })
  isAvailable: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @ManyToOne(() => LocationAvailability, (availability) => availability.workingDates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'location_availability_id' })
  locationAvailability: LocationAvailability;
} 