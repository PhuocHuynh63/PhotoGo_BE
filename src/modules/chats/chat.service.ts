import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from './entities/chat.entity';
import { UserService } from 'src/modules/users/user.service';

@Injectable()
export class ChatService {
  // Define unchatable roles using their string names
  private unchatableRoles: string[] = ['R005', 'R006', 'R007']; // Adjust as needed

  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    private readonly userService: UserService,
  ) {}

  // Change signature: now accepts an array of member IDs
  async createChat(members: string[]): Promise<Chat> {
    // Sort & deduplicate the members array.
    const sortedMembers = Array.from(new Set(members)).sort();

    // If there is only one member after deduplication, they are trying to chat with themselves.
    if (sortedMembers.length < 2) {
      throw new BadRequestException('Không thể trò chuyện với bản thân');
    }
    
    // Determine the partner's id. For simplicity, assume caller is the first element.
    // In real usage, you may want to check which one is not the caller.
    const partnerId = sortedMembers[0] === members[0] ? sortedMembers[1] : sortedMembers[0];

    // Fetch the partner user details.
    const partner = await this.userService.findOne(partnerId);
    if (!partner) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng của đối tác');
    }

    // If partner.role is an object, use partner.role.name. Otherwise, use partner.role directly.
    const partnerRole: string = typeof partner.role === 'object' ? partner.role.id : partner.role;
    if (this.unchatableRoles.includes(partnerRole)) {
      throw new BadRequestException(
        `Không thể trò truyện với người dùng có chức vụ là: ${partner.role.name}`,
      );
    }

    // Try to find an existing chat with these exact members.
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