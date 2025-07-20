import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { LuckyWheel } from './lucky-wheel.entity';
import { LuckyWheelPrize } from './lucky-wheel-prize.entity';
import { User } from '../../users/entities/user.entity';

export enum SpinStatus {
    PENDING = 'pending',     // Đang xử lý
    COMPLETED = 'completed', // Hoàn thành
    FAILED = 'failed',       // Thất bại
    CANCELLED = 'cancelled', // Đã hủy
}

@Entity('lucky_wheel_spin')
export class LuckyWheelSpin {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    user_id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'uuid' })
    wheel_id: string;

    @ManyToOne(() => LuckyWheel, wheel => wheel.spins, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'wheel_id' })
    wheel: LuckyWheel;

    @Column({ type: 'uuid', nullable: true })
    prize_id: string;

    @ManyToOne(() => LuckyWheelPrize, prize => prize.spins, { nullable: true })
    @JoinColumn({ name: 'prize_id' })
    prize: LuckyWheelPrize;

    @Column({ type: 'integer', default: 0 })
    cost_points: number; // Số điểm đã trả để quay

    @Column({ type: 'enum', enum: SpinStatus, default: SpinStatus.PENDING })
    status: SpinStatus;

    @Column({ type: 'text', nullable: true })
    result_description: string; // Mô tả kết quả: "Bạn đã trúng 100 điểm!"

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    spin_angle: number; // Góc quay (0-360 degrees)

    @Column({ type: 'text', nullable: true })
    error_message: string; // Thông báo lỗi (nếu có)

    // Metadata để track transaction IDs
    @Column({ type: 'uuid', nullable: true })
    point_transaction_id: string; // ID transaction trừ điểm (nếu có)

    @Column({ type: 'uuid', nullable: true })
    reward_point_transaction_id: string; // ID transaction cộng điểm thưởng

    @Column({ type: 'uuid', nullable: true })
    voucher_user_id: string; // ID VoucherUser record (nếu trúng voucher)

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    completed_at: Date; // Thời gian hoàn thành
} 