import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
    OneToMany,
  } from 'typeorm';
import { ServiceConceptStatus } from 'src/constants/servicePackage.enum';
import { ServicePackage } from './service-package.entity';
import { ServiceConceptServiceType } from './service-concept-service-type.entity';


@Entity('service_concept')
export class ServiceConcept {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'service_package_id', nullable: false })
  servicePackageId: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column("text", { array: true, nullable: true , name: 'image_url'})
  images: string[];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0, nullable: false })
  price: number;

  @Column({ type: 'int', nullable: false })
  duration: number;

  @Column({ type: 'enum', enum: ServiceConceptStatus, default: ServiceConceptStatus.ACTIVE })
  status: ServiceConceptStatus;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @ManyToOne(() => ServicePackage, (servicePackage) => servicePackage.serviceConcepts)
  @JoinColumn({ name: 'service_package_id' })
  servicePackage: ServicePackage;

  @OneToMany(() => ServiceConceptServiceType, (serviceConceptServiceType) => serviceConceptServiceType.serviceConcept)
  serviceConceptServiceTypes: ServiceConceptServiceType[];

}
