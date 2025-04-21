import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from './entities/chat.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
  ) {}

  // Create (or retrieve) a chat with a given set of members.
  async createChat(members: string[]): Promise<Chat> {
    const sortedMembers = Array.from(new Set(members)).sort();
    // Try to retrieve an existing chat with these members
    let chat = await this.getChatByMembers(sortedMembers);
    if (!chat) {
      chat = this.chatRepository.create({
        members: sortedMembers,
        messages: [],
      });
      chat = await this.chatRepository.save(chat);
    }
    return chat;
  }
  

  async getChatsByMember(memberId: string): Promise<Chat[]> {
    // Find chats where the given member is a participant
    return this.chatRepository
      .createQueryBuilder('chat')
      .where(':member = ANY(chat.members)', { member: memberId })
      .getMany();
  }

  async getChatByMembers(members: string[]): Promise<Chat> {
    const sortedMembers = Array.from(new Set(members)).sort();
    return this.chatRepository
      .createQueryBuilder('chat')
      // ensure parameters are passed as a UUID array
      .where('chat.members @> ARRAY[:...members]::uuid[]', { members: sortedMembers })
      .andWhere('array_length(chat.members, 1) = :length', { length: sortedMembers.length })
      .getOne();
  }

  async createMessage(
    chatId: string,
    message: { sender_id: string; text: string; timestamp?: string },
  ): Promise<Chat> {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    if (!chat) {
      throw new NotFoundException('Không tìm thấy cuộc trò chuyện');
    }
    const newMessage = {
      sender_id: message.sender_id,
      text: message.text,
      timestamp: message.timestamp || new Date().toISOString(),
    };
    chat.messages.push(newMessage);
    return await this.chatRepository.save(chat);
  }
}