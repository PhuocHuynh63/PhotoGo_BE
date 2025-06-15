import { Controller, Post, Get, Body, Param, Req, Query, UseGuards, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Chat } from './entities/chat.entity';
import { CreateChatDto } from './dto/create-chat.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport'; // Giả sử bạn dùng passport-jwt
import { Message } from '../message/entities/message.entity';

@ApiTags('Chats')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt')) // Bảo vệ tất cả các endpoint trong controller này
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  /**
   * Endpoint để tìm hoặc tạo một cuộc hội thoại mới.
   * Cách tiếp cận này hiệu quả hơn việc có 2 endpoint riêng biệt.
   */
  @Post()
  @ApiOperation({ summary: 'Tìm hoặc tạo một cuộc hội thoại mới với một đối tác' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Đã tìm thấy cuộc hội thoại.', type: Chat })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Đã tạo cuộc hội thoại thành công.', type: Chat })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dữ liệu đầu vào không hợp lệ.' })
  async findOrCreateChat(@Req() req: any, @Body() createChatDto: CreateChatDto): Promise<Chat> {
    const userId: string = req.user.userId || req.user.sub;
    return this.chatService.findOrCreateChat(createChatDto, userId);
  }

  /**
   * Endpoint để lấy danh sách các cuộc hội thoại của người dùng đang đăng nhập (cho sidebar).
   */
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách cuộc hội thoại của người dùng hiện tại' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Số lượng trên mỗi trang' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy danh sách thành công.', type: [Chat] })
  async getMyChats(@Req() req: any, @Query('page') page?: number, @Query('pageSize') pageSize?: number): Promise<Chat[]> {
    const userId: string = req.user.userId || req.user.sub;
    return this.chatService.getChatsForUser(userId, page, pageSize);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Lấy danh sách cuộc hội thoại với một người dùng cụ thể' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Số lượng trên mỗi trang' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy danh sách thành công.', type: [Chat] })
  async getChatsForUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<Chat[]> {
    return this.chatService.getChatsForUser(userId, page, pageSize);
  }

  /**
   * Endpoint để lấy lịch sử tin nhắn của một cuộc hội thoại cụ thể.
   * Endpoint này an toàn và chính xác hơn vì dùng `chatId`.
   */
  @Get(':chatId/messages')
  @ApiOperation({ summary: 'Lấy tin nhắn của một cuộc hội thoại theo ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Số lượng tin nhắn trên mỗi trang' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy tin nhắn thành công.', type: [Message] })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy cuộc hội thoại.' })
  async getMessagesForChat(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<Message[]> {
    // TODO: Thêm một bước kiểm tra để đảm bảo người dùng hiện tại là thành viên của `chatId` này.
    return this.chatService.getMessagesForChat(chatId, page, pageSize);
  }

  /**
   * Endpoint để đánh dấu các tin nhắn trong một cuộc hội thoại là đã đọc.
   */
  @Post(':chatId/read')
  @ApiOperation({ summary: 'Đánh dấu các tin nhắn trong cuộc hội thoại là đã đọc' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Đánh dấu đã đọc thành công.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy cuộc hội thoại.' })
  async markMessagesAsRead(@Req() req: any, @Param('chatId', ParseUUIDPipe) chatId: string): Promise<{ message: string }> {
    const userId: string = req.user.userId || req.user.sub;
    await this.chatService.markMessagesAsRead(chatId, userId);
    return { message: 'Các tin nhắn đã được đánh dấu là đã đọc.' };
  }
}