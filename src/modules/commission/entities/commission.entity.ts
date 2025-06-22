import { ServiceConcept } from "src/modules/service-package/entities/service-concept.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CommissionStatus, CommissionType } from "src/constants/commision.enum";

@Entity('commission')
export class Commission {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ServiceConcept, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'service_concept_id' })
    serviceConcept: ServiceConcept;

    @Column({ name: 'service_concept_id', type: 'uuid', nullable: false })
    serviceConceptId: string;
    
    @Column({ name: 'commission_rate', type: 'float', nullable: false })
    commissionRate: number;

    @Column({ name: 'commission_amount', type: 'float', nullable: true })
    commissionAmount: number;

    @Column({ name: 'commission_type', type: 'enum', enum: CommissionType, nullable: false })
    commissionType: CommissionType;

    @Column({ name: 'status', type: 'enum', enum: CommissionStatus, default: CommissionStatus.ACTIVE })
    status: CommissionStatus;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    updated_at: Date;
    
}