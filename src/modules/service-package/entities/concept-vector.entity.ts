import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServiceConcept } from './service-concept.entity';

@Entity({ name: 'concept_vector' })
export class ConceptVector {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'concept_id', type: 'uuid' })
  conceptId: string;

  @Column('text', { array: true, nullable: true })
  keywords: string[];

  @Column('float', { array: true, name: 'embedding', type: 'vector' })
  embedding: number[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => ServiceConcept, (serviceConcept) => serviceConcept.id)
  @JoinColumn({ name: 'concept_id' })
  serviceConcept: ServiceConcept;
} 