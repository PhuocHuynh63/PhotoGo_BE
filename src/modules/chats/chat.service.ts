import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from './entities/chat.entity';
import { UserService } from 'src/modules/users/user.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { FindChatDto } from './dto/find-chat.dto';

@Injectable()
export class ChatService {
  // Define unchatable roles using their string names
  private unchatableRoles: string[] = ['R005', 'R006', 'R007']; // Adjust as needed

  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    private readonly userService: UserService,
  ) { }

  // Consolidated method: accepts a DTO and the caller's userId.
  async createChat(createChatDto: CreateChatDto, userId: string): Promise<Chat> {
    // Assemble the members array using the user's id from token and the partnerId from the DTO.
    const members = [userId, createChatDto.partnerId];
    const sortedMembers = Array.from(new Set(members)).sort();

    if (sortedMembers.length < 2) {
      throw new Error('Không thể trò chuyện với bản thân');
    }

    const partnerId = sortedMembers[0] === members[0] ? sortedMembers[1] : sortedMembers[0];

    let partner;
    try {
      partner = await this.userService.findOne(partnerId);
    } catch (error) {
      // Replace HTTP exception with a plain error
      throw new Error(`Người dùng với ID ${partnerId} không tồn tại`);
    }

    const partnerRole: string = typeof partner.role === 'object' ? partner.role.id : partner.role;
    if (this.unchatableRoles.includes(partnerRole)) {
      const roleName = typeof partner.role === 'object' ? partner.role.name : partner.role;
      throw new Error(`Không thể trò truyện với người dùng có chức vụ là: ${roleName}`);
    }

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

  async findChat(findChatDto: FindChatDto, userId: string): Promise<Chat> {
    const members = [userId, findChatDto.partnerId];
    const chat = await this.getChatByMembers(members);
    if (!chat) {
      throw new NotFoundException('Không tìm thấy cuộc trò chuyện');
    }
    return chat;
  }

  async getChatsByMember(memberId: string): Promise<Chat[]> {
    return this.chatRepository
      .createQueryBuilder('chat')
      .where(':member = ANY(chat.members)', { member: memberId })
      .getMany();
  }

  async getChatByMembers(members: string[]): Promise<Chat> {
    const sortedMembers = Array.from(new Set(members)).sort();
    return this.chatRepository
      .createQueryBuilder('chat')
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