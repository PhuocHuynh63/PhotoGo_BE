import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('attendance')
export class Attendance {
  @PrimaryGeneratedColumn({ name: 'attendance_id' })
  attendanceId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'is_checked', default: false })
  isChecked: boolean;

  @Column({ default: 0 })
  streak: number;

  @Column({ name: 'points_earned', default: 0 })
  pointsEarned: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
} 