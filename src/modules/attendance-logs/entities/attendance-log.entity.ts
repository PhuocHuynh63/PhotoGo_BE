import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('attendance_logs')
export class AttendanceLog {
  @PrimaryGeneratedColumn({ name: 'log_id' })
  logId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ type: 'date' })
  date: Date;

  @Column()
  action: string;

  @Column({ name: 'points_earned', default: 0 })
  pointsEarned: number;

  @Column({ default: 0 })
  streak: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
} 