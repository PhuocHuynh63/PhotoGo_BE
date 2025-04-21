import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum SupportTicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

@Entity('support_ticket')
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.id , { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 100, nullable: false })
  subject: string;

  @Column({ type: 'text', nullable: false })
  description: string;

  @Column({ type: 'enum', enum: SupportTicketStatus, default: SupportTicketStatus.OPEN })
  status: SupportTicketStatus;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()', onUpdate: 'NOW()' })
  updated_at: Date;
}