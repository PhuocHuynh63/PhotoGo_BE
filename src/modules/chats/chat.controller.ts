import { Controller, Post, Body, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Chat } from './entities/chat.entity';
import { JwtAuthGuard } from 'src/modules/auth/passport/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createChat(
    @Req() req: any,
    @Body() body: { partnerId: string },
  ): Promise<Chat> {
    // Create a chat with both user's IDs in a members array.
    const members = [req.user.userId, body.partnerId];
    return this.chatService.createChat(members);
  }

  // Example: Get chats by a member's id
  @UseGuards(JwtAuthGuard)
  @Get('member/:memberId')
  async getChatsByMember(@Param('memberId') memberId: string): Promise<Chat[]> {
    return this.chatService.getChatsByMember(memberId);
  }

  // Example: Get a private chat between two members
  @UseGuards(JwtAuthGuard)
  @Get(':partnerId')
  async getChat(
    @Req() req: any,
    @Param('partnerId') partnerId: string,
  ): Promise<Chat> {
    const members = [req.user.userId, partnerId];
    return this.chatService.getChatByMembers(members);
  }
}