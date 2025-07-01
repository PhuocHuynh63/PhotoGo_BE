import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ServiceConceptServiceType } from './service-concept-service-type.entity';
import { ServiceTypeStatus } from 'src/constants/serviceType.enum';

@Entity('service_type')
export class ServiceType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ 
    type: 'enum', 
    enum: ServiceTypeStatus, 
    default: ServiceTypeStatus.ACTIVE,
    nullable: false 
  })
  status: ServiceTypeStatus;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @OneToMany(() => ServiceConceptServiceType, (serviceConceptServiceType) => serviceConceptServiceType.serviceType)
  serviceConceptServiceTypes: ServiceConceptServiceType[];
}