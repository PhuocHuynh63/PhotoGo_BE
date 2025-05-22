import { Controller, Post, Get, Body, Param, Req, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Chat } from './entities/chat.entity';
import { CreateChatDto } from './dto/create-chat.dto';
import { FindChatDto } from './dto/find-chat.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Chats')
@ApiBearerAuth('access-token')
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new chat' })
  @ApiResponse({ status: 201, description: 'Chat created successfully', type: Chat })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createChat(@Req() req: any, @Body() createChatDto: CreateChatDto): Promise<Chat> {
    // Use the token's user ID as the caller. The service method createChatFromDto calls the established createChat.
    const userId: string = req.user.userId || req.user.sub;
    return this.chatService.createChat(createChatDto, userId);
  }

  @Get(':partnerId')
  @ApiOperation({ summary: 'Get a chat between the current user and a partner' })
  @ApiResponse({ status: 200, description: 'Chat found', type: Chat })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  async getChat(@Req() req: any, @Param('partnerId') partnerId: string): Promise<Chat> {
    const userId: string = req.user.userId || req.user.sub;
    const findChatDto: FindChatDto = { partnerId };
    return this.chatService.findChat(findChatDto, userId);
  }
//sort
  @Get('member/:memberId')
  @ApiOperation({ summary: 'Get all chats for a member' })
  @ApiResponse({ status: 200, description: 'Chats retrieved successfully', type: [Chat] })
  async getChatsByMember(@Param('memberId') memberId: string): Promise<Chat[]> {
    return this.chatService.getChatsByMember(memberId);
  }

  @Get('member-sorted/:memberId')
  @ApiOperation({ 
    summary: 'Get sorted chats for a member with pagination',
    description: 'Returns chats for the member sorted by last_updated timestamp in descending order. Paging is supported with default page 1 and 10 chats per page.'
  })
  @ApiResponse({ status: 200, description: 'Chats retrieved successfully', type: [Chat] })
  async getChatsByMemberSorted(
    @Param('memberId') memberId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<Chat[]> {
    return this.chatService.getChatsByMemberSorted(memberId, page || 1, pageSize || 10);
  }
}