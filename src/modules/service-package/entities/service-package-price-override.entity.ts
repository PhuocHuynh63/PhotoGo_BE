import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServicePackage } from './service-package.entity';

@Entity('service_package_price_override')
export class ServicePackagePriceOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ServicePackage, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_package_id' })
  servicePackage: ServicePackage;

  @Column({ type: 'uuid', name: 'service_package_id', nullable: false })
  servicePackageId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  overridePrice: number;

  @Column({ type: 'date', nullable: false })
  startDate: Date;

  @Column({ type: 'date', nullable: false })
  endDate: Date;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}