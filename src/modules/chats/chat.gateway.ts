import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) { }

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query.token;
    if (!token) {
      console.log(`Client ${client.id} has no token`);
      client.disconnect();
      return;
    }
    try {
      const decoded = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
      client.data.user = decoded;
      console.log(`Client connected: ${client.id}, user: ${decoded.sub}`);
      const userId = decoded.userId || decoded.sub;
      client.join(userId);
    } catch (error) {
      console.log(`Token verification failed for client ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Socket event: joinChat
  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody() data: { memberId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.user?.userId || client.data.user?.sub;
      if (!userId) {
        client.disconnect();
        return;
      }
      // Check if the partner memberId is valid (not null or "NULL")
      if (!data.memberId || data.memberId.toLowerCase() === 'null') {
        client.emit('error', { message: 'Invalid partner id' });
        return;
      }
      // Build sorted members array if needed
      const members = [userId, data.memberId];
      // Create or retrieve a chat
      const chat = await this.chatService.createChat(members);
      client.join(chat.id);
      client.emit('joinedRoom', { chatId: chat.id, messages: chat.messages });
    } catch (error) {
      console.error(`Error in joinChat: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  // Socket event: sendMessage using sender id from token.
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { chatId: string; text: string; timestamp?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const sender_id = client.data.user?.userId || client.data.user?.sub;
      if (!sender_id) {
        client.disconnect();
        return;
      }
      const messagePayload = {
        sender_id,
        text: data.text,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      const updatedChat = await this.chatService.createMessage(data.chatId, messagePayload);

      // Emit to those who have joined the specific chat room.
      client.to(data.chatId).emit('messageReceived', updatedChat);

      // For each member in the chat (if conversation is exactly two users), notify the recipient
      updatedChat.members.forEach(memberId => {
        if (memberId !== sender_id) {
          // Emit a notification to the recipient's personal room.
          client.to(memberId).emit('chatNotification', {
            chatId: data.chatId,
            newMessage: messagePayload,
          });
        }
      });
    } catch (error) {
      console.error(`Error in sendMessage: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }
}