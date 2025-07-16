import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { LuckyWheel } from './lucky-wheel.entity';
import { LuckyWheelSpin } from './lucky-wheel-spin.entity';
import { Voucher } from '../../vouchers/entities/voucher.entity';

export enum PrizeType {
    POINTS = 'points',     // Phần thưởng điểm
    VOUCHER = 'voucher',   // Phần thưởng voucher
    EMPTY = 'empty',       // Không trúng gì
}

@Entity('lucky_wheel_prize')
export class LuckyWheelPrize {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    wheel_id: string;

    @ManyToOne(() => LuckyWheel, wheel => wheel.prizes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'wheel_id' })
    wheel: LuckyWheel;

    @Column({ length: 255 })
    name: string; // Tên phần thưởng: "100 điểm", "Voucher giảm giá 20%", etc.

    @Column({ type: 'enum', enum: PrizeType })
    type: PrizeType;

    @Column({ type: 'integer', nullable: true })
    points_value: number; // Giá trị điểm (nếu type = POINTS)

    @Column({ type: 'uuid', nullable: true })
    voucher_id: string; // ID voucher (nếu type = VOUCHER)

    @ManyToOne(() => Voucher, { nullable: true })
    @JoinColumn({ name: 'voucher_id' })
    voucher: Voucher;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.00 })
    probability: number; // Xác suất trúng (0-100)

    @Column({ type: 'integer', default: -1 })
    max_quantity: number; // Số lượng tối đa (-1 = không giới hạn)

    @Column({ type: 'integer', default: 0 })
    used_quantity: number; // Số lượng đã sử dụng

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'varchar', length: 10, nullable: true })
    color: string; // Màu sắc hiển thị trên vòng quay (hex code)

    @Column({ type: 'text', nullable: true })
    icon_url: string; // URL icon hiển thị

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;

    // Relations
    @OneToMany(() => LuckyWheelSpin, spin => spin.prize)
    spins: LuckyWheelSpin[];
} 