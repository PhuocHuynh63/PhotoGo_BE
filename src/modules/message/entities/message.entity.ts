import { Chat } from 'src/modules/chats/entities/chat.entity';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('message')
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    text: string;

    @CreateDateColumn({
        type: 'timestamptz',
        default: () => 'CURRENT_TIMESTAMP'
    })
    timestamp: Date;

    @Column({ type: 'boolean', default: false })
    isRead: boolean;

    @Column({ type: 'uuid' })
    senderId: string;

    @Column({ type: 'uuid' })
    chatId: string;

    @ManyToOne(() => Chat, chat => chat.messages)
    chat: Chat;
}
