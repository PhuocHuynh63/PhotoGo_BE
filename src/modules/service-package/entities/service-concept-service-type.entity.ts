import {
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
} from 'typeorm';
import { ServicePackage } from './service-package.entity';
import { ServiceType } from './service-type.entity';
import { ServiceConcept } from './service-concept.entity';

@Entity('service_concept_service_type')
export class ServiceConceptServiceType {
  @PrimaryColumn({ type: 'uuid' })
  serviceConceptId: string;

  @PrimaryColumn({ type: 'uuid' })
  serviceTypeId: string;

  @ManyToOne(() => ServiceConcept, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_concept_id' })
  serviceConcept: ServiceConcept;

  @ManyToOne(() => ServiceType, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_type_id' })
  serviceType: ServiceType;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}