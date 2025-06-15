import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Chat } from './entities/chat.entity';
import { UserService } from 'src/modules/users/user.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { Message } from '../message/entities/message.entity';

@Injectable()
export class ChatService {
  // Danh sách các vai trò không được phép tạo cuộc hội thoại
  private unchatableRoles: string[] = ['R005', 'R006', 'R007'];

  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly userService: UserService,
  ) { }

  /**
   * Tìm hoặc tạo mới một cuộc hội thoại 1-1.
   * @param createChatDto DTO chứa ID của đối tác
   * @param userId ID của người dùng đang thực hiện yêu cầu
   * @returns Cuộc hội thoại đã tồn tại hoặc vừa được tạo
   */
  async findOrCreateChat(createChatDto: CreateChatDto, userId: string): Promise<Chat> {
    const members = [userId, createChatDto.partnerId].sort();

    if (members[0] === members[1]) {
      throw new BadRequestException('Không thể trò chuyện với chính mình.');
    }

    // Kiểm tra xem đối tác có tồn tại và có được phép chat không
    const partner = await this.userService.findOne(createChatDto.partnerId);
    if (!partner) {
      throw new NotFoundException(`Người dùng với ID ${createChatDto.partnerId} không tồn tại.`);
    }

    const partnerRole: string = typeof partner.role === 'object' ? partner.role.id : partner.role;
    if (this.unchatableRoles.includes(partnerRole)) {
      const roleName = typeof partner.role === 'object' ? partner.role.name : partner.role;
      throw new BadRequestException(`Không thể trò chuyện với người dùng có chức vụ là: ${roleName}.`);
    }

    // Tìm xem cuộc hội thoại đã tồn tại chưa
    let chat = await this.getChatByMembers(members);

    // Nếu chưa, tạo mới
    if (!chat) {
      chat = this.chatRepository.create({ members });
      await this.chatRepository.save(chat);
    }

    return chat;
  }

  /**
   * Tạo và lưu một tin nhắn mới vào cơ sở dữ liệu.
   * Đồng thời cập nhật thông tin cho cuộc hội thoại cha.
   * @param chatId ID của cuộc hội thoại
   * @param senderId ID của người gửi
   * @param text Nội dung tin nhắn
   * @returns Tin nhắn vừa được tạo
   */
  async createMessage(chatId: string, senderId: string, text: string): Promise<Message> {
    // 1. Kiểm tra xem cuộc hội thoại có tồn tại không
    const chatExists = await this.chatRepository.findOneBy({ id: chatId });
    if (!chatExists) {
      throw new NotFoundException(`Cuộc hội thoại với ID ${chatId} không tồn tại.`);
    }

    // 2. Tạo và lưu tin nhắn vào bảng `Message`
    const newMessage = this.messageRepository.create({ chatId, senderId, text });
    await this.messageRepository.save(newMessage);

    // 3. Cập nhật `lastMessageText` và `lastUpdatedAt` của cuộc hội thoại cha
    // Thao tác này rất nhanh, chỉ cập nhật 1 hàng trong bảng `Chat`
    await this.chatRepository.update(chatId, {
      lastMessageText: text,
      lastUpdatedAt: new Date(),
    });

    return newMessage;
  }

  /**
   * Lấy danh sách các cuộc hội thoại của một người dùng cho sidebar.
   * Đã được sắp xếp theo thời gian cập nhật mới nhất và có phân trang.
   * @param userId ID của người dùng
   * @param page Trang hiện tại
   * @param pageSize Số lượng cuộc hội thoại trên mỗi trang
   * @returns Mảng các cuộc hội thoại
   */
  async getChatsForUser(userId: string, page: number = 1, pageSize: number = 20): Promise<Chat[]> {
    return this.chatRepository
      .createQueryBuilder('chat')
      .where(':memberId = ANY(chat.members)', { memberId: userId })
      .orderBy('chat.lastUpdatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();
  }

  /**
   * Lấy lịch sử tin nhắn của một cuộc hội thoại với phân trang hiệu quả.
   * Chỉ lấy đúng số lượng tin nhắn cần thiết từ database.
   * @param chatId ID của cuộc hội thoại
   * @param page Trang hiện tại
   * @param pageSize Số lượng tin nhắn trên mỗi trang
   * @returns Mảng các tin nhắn
   */
  async getMessagesForChat(chatId: string, page: number = 1, pageSize: number = 50): Promise<Message[]> {
    return this.messageRepository.find({
      where: { chatId },
      order: { timestamp: 'DESC' }, // Sắp xếp để lấy tin nhắn mới nhất trước
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  /**
   * Đánh dấu các tin nhắn đã được đọc bởi một người dùng.
   * Sử dụng một câu lệnh UPDATE duy nhất, cực kỳ hiệu quả.
   * @param chatId ID của cuộc hội thoại
   * @param readerId ID của người dùng đã đọc tin nhắn
   */
  async markMessagesAsRead(chatId: string, readerId: string): Promise<void> {
    await this.messageRepository.update(
      {
        chatId: chatId,
        senderId: Not(readerId), // Chỉ cập nhật tin nhắn không phải do mình gửi
        isRead: false,           // Và đang ở trạng thái chưa đọc
      },
      {
        isRead: true, // Cập nhật thành đã đọc
      },
    );
  }

  /**
   * Phương thức helper để tìm một cuộc hội thoại dựa trên mảng các thành viên.
   * Logic của bạn đã tốt và hiệu quả cho PostgreSQL.
   * @param members Mảng các ID thành viên đã được sắp xếp
   * @returns Cuộc hội thoại nếu tìm thấy, hoặc null
   */
  private async getChatByMembers(members: string[]): Promise<Chat | null> {
    return this.chatRepository
      .createQueryBuilder('chat')
      // Query này đảm bảo tìm chính xác cuộc hội thoại có đủ và chỉ có các thành viên này
      .where('chat.members @> ARRAY[:...members]::uuid[] AND chat.members <@ ARRAY[:...members]::uuid[]', { members })
      .getOne();
  }
}