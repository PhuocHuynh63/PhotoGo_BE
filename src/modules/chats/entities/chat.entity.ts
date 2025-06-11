import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

interface ChatMessage {
  sender_id: string;
  text: string;
  timestamp: string;
  isRead: boolean;  // New property to track read/unread status
}

@Entity('chat')
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Array of member UUIDs participating in the chat
  @Column({ type: 'uuid', array: true, nullable: false })
  members: string[];

  // JSONB field storing an array of message objects.
  // Each message is now defined as follows:
  // {
  //   sender_id: "some-uuid",
  //   text: "Hello",
  //   timestamp: "2025-04-21T10:00:00Z",
  //   isRead: false  // Defaults to false (unread)
  // }
  @Column({ type: 'jsonb', default: () => "'[]'" })
  messages: ChatMessage[];

  @UpdateDateColumn({
    type: 'timestamptz',
    default: () => 'NOW()',
    onUpdate: 'NOW()'
  })
  last_updated: Date;
}