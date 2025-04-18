import {
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
} from 'typeorm';
import { ServicePackage } from './service-package.entity';
import { ServiceType } from './service-type.entity';

@Entity('service_package_service_type')
export class ServicePackageServiceType {
  @PrimaryColumn({ type: 'uuid' })
  servicePackageId: string;

  @PrimaryColumn({ type: 'uuid' })
  serviceTypeId: string;

  @ManyToOne(() => ServicePackage, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_package_id' })
  servicePackage: ServicePackage;

  @ManyToOne(() => ServiceType, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_type_id' })
  serviceType: ServiceType;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}