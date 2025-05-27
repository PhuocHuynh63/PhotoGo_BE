import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ServiceConcept } from './service-concept.entity';

@Entity('service_concept_image')
export class ServiceConceptImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'service_concept_id' })
  serviceConceptId: string;

  @Column({ name: 'image_url', type: 'text' })
  imageUrl: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => ServiceConcept, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_concept_id' })
  serviceConcept: ServiceConcept;
}
