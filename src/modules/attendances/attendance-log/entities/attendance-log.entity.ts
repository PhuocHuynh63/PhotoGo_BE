import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../../users/entities/user.entity';

@Entity('attendance_logs')
export class AttendanceLog {
    @PrimaryGeneratedColumn('bigint', { name: 'log_id' })
    id: string;

    @Column({ type: 'uuid', name: 'user_id' })
    userId: string;

    @Column({ type: 'date' })
    date: Date;

    @Column({ type: 'varchar', length: 50 })
    action: AttendanceAction;

    @Column({
        name: 'points_earned',
        type: 'integer',
        default: 0
    })
    pointsEarned: number;

    @Column({
        type: 'integer',
        default: 0
    })
    streak: number;

    @CreateDateColumn({
        name: 'created_at',
        type: 'timestamp'
    })
    createdAt: Date;

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'user_id' })
    user: User;
}