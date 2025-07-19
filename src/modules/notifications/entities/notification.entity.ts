import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationType } from '../../../constants/notification.enum';



@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 100, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  message: string;

  @Column({ type: 'enum', enum: NotificationType, nullable: false })
  type: NotificationType;

  @Column({ type: 'boolean', nullable: false, default: false })
  is_read: boolean;

  @Column({ type: 'text', nullable: true })
  data: string;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at: Date;
}