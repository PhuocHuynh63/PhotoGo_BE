import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { LuckyWheelPrize } from './lucky-wheel-prize.entity';
import { LuckyWheelSpin } from './lucky-wheel-spin.entity';
import { Campaign } from '../../campaign/entities/campaign.entity';

export enum LuckyWheelStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SCHEDULED = 'scheduled',
}

export enum LuckyWheelType {
    FREE = 'free',        // Miễn phí
    POINTS = 'points',    // Trả bằng điểm
    CAMPAIGN = 'campaign', // Trong campaign
}

@Entity('lucky_wheel')
export class LuckyWheel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'enum', enum: LuckyWheelType, default: LuckyWheelType.FREE })
    type: LuckyWheelType;

    @Column({ type: 'integer', default: 0 })
    cost_points: number; // Số điểm cần để quay (0 = miễn phí)

    @Column({ type: 'integer', default: 1 })
    daily_spin_limit: number; // Giới hạn số lần quay/ngày

    @Column({ type: 'enum', enum: LuckyWheelStatus, default: LuckyWheelStatus.ACTIVE })
    status: LuckyWheelStatus;

    @Column({ type: 'date', nullable: true })
    start_date: Date;

    @Column({ type: 'date', nullable: true })
    end_date: Date;

    // Liên kết với campaign (optional)
    @Column({ type: 'uuid', nullable: true })
    campaign_id: string;

    @ManyToOne(() => Campaign, { nullable: true })
    @JoinColumn({ name: 'campaign_id' })
    campaign: Campaign;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;

    // Relations
    @OneToMany(() => LuckyWheelPrize, prize => prize.wheel)
    prizes: LuckyWheelPrize[];

    @OneToMany(() => LuckyWheelSpin, spin => spin.wheel)
    spins: LuckyWheelSpin[];
} 