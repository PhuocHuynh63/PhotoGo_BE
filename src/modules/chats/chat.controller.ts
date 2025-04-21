import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatConversation } from './entities/chat.entity';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async createChat(@Body() body: { vendorId: string; userId: string }): Promise<ChatConversation> {
    return this.chatService.createChat(body.vendorId, body.userId);
  }

  @Get('user/:userId')
  async getChatsByUser(@Param('userId') userId: string): Promise<ChatConversation[]> {
    return this.chatService.getChatsByUser(userId);
  }

  @Get(':vendorId/:userId')
  async getChat(
    @Param('vendorId') vendorId: string,
    @Param('userId') userId: string,
  ): Promise<ChatConversation> {
    return this.chatService.getChat(vendorId, userId);
  }
}