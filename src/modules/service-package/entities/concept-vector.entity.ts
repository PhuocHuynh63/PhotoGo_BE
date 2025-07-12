import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, ValueTransformer } from 'typeorm';
import { ServiceConcept } from './service-concept.entity';
import { ServiceConceptImage } from './service-concept-image.entity';

export const VectorTransformer: ValueTransformer = {
    to: (value: number[] | null) => {
        if (!value) return null;
        if (!Array.isArray(value) || value.length !== 768 || !value.every(val => typeof val === 'number' && !isNaN(val))) {
            throw new Error(`Invalid embedding vector: must be an array of 768 numbers, got ${JSON.stringify(value)}`);
        }
        return `[${value.join(',')}]`; // Chuyển thành [1.1,0.3,...]
    },
    from: (value: string | null) => {
        if (!value) return null;
        return value
            .replace('[', '')
            .replace(']', '')
            .split(',')
            .map((v) => parseFloat(v.trim()));
    },
};

@Entity({ name: 'concept_vector' })
export class ConceptVector {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'concept_image_id', type: 'uuid' })
    concept_image_id: string;

    @Column('text', { array: true, nullable: true })
    keywords: string[];

    @Column('float', { transformer: VectorTransformer, nullable: true })
    embedding: number[];

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    @ManyToOne(() => ServiceConceptImage, (image) => image.id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'concept_image_id' })
    serviceConceptImage: ServiceConceptImage;
}