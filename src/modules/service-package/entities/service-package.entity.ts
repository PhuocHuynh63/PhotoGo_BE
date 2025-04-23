import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Vendor } from '../../vendors/entities/vendor.entity';

import { ServicePackageStatus } from 'src/constants/servicePackage.enum';

@Entity('service_package')
export class ServicePackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Vendor, (vendor) => vendor.servicePackages, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ type: 'uuid', name: 'vendor_id', nullable: false }) // Đảm bảo ánh xạ đúng với vendor_id
  vendorId: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0, nullable: false })
  price: number;

  @Column({ type: 'int', nullable: false })
  duration: number; // Duration in minutes

  @Column({
    type: 'enum',
    enum: ServicePackageStatus,
    default: ServicePackageStatus.ACTIVE,
  })
  status: ServicePackageStatus;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}