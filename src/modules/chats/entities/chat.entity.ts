import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('chat')
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Array of member UUIDs participating in the chat
  @Column({ type: 'uuid', array: true, nullable: false })
  members: string[];

  // JSONB field to store an array of message objects.
  // Each message can be structured as:
  // { "sender_id": "some-uuid", "text": "Hello", "timestamp": "2025-04-21T10:00:00Z" }
  @Column({ type: 'jsonb', default: () => "'[]'" })
  messages: any[];

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()', onUpdate: 'NOW()' })
  last_updated: Date;
}