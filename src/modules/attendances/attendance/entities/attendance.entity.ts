import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from '../../../users/entities/user.entity';

@Entity('attendance')
@Unique(['userId', 'date']) // Composite unique constraint
export class Attendance {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'attendance_id' })
  id: string;
  
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'date' })
  date: Date;

  @Column({
    type: 'boolean',
    name: 'is_checked',
    default: false
  })
  isChecked: boolean;

  @Column({
    type: 'integer',
    default: 0
  })
  streak: number;

  @Column({
    type: 'integer',
    name: 'points_earned',
    default: 0
  })
  pointsEarned: number;
}