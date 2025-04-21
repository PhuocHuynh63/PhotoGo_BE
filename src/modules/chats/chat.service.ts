import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatConversation } from './entities/chat.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatConversation)
    private readonly chatRepository: Repository<ChatConversation>,
  ) {}

  async createChat(vendorId: string, userId: string): Promise<ChatConversation> {
    let chat = await this.chatRepository.findOne({ where: { vendor_id: vendorId, user_id: userId } });
    if (!chat) {
      chat = this.chatRepository.create({
        vendor_id: vendorId,
        user_id: userId,
        messages: [],
      });
      chat = await this.chatRepository.save(chat);
    }
    return chat;
  }

  async getChatsByUser(userId: string): Promise<ChatConversation[]> {
    return this.chatRepository.find({ where: { user_id: userId } });
  }

  async getChat(vendorId: string, userId: string): Promise<ChatConversation> {
    return this.chatRepository.findOne({ where: { vendor_id: vendorId, user_id: userId } });
  }

  async createMessage(chatId: string, message: { sender_id: string; text: string; timestamp?: string }): Promise<ChatConversation> {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    if (!chat) {
      throw new NotFoundException('Chat conversation not found');
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