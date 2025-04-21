import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('chat')
export class ChatConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  user_id: string;

  @Column({ type: 'uuid', nullable: false })
  vendor_id: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  messages: any[];

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  last_updated: Date;
}