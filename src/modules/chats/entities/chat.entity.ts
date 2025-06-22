import { Message } from 'src/modules/message/entities/message.entity';
import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, OneToMany, CreateDateColumn } from 'typeorm';

@Entity('chat')
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Array of member UUIDs participating in the chat
  @Column({ type: 'uuid', array: true, nullable: false })
  members: string[];

  @Column({ type: 'text', nullable: true })
  lastMessageText?: string;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  lastUpdatedAt: Date;

  @OneToMany(() => Message, message => message.chat)
  messages: Message[];
}