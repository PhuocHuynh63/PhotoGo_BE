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
  ) {}

  handleConnection(client: Socket) {
    const token =
      client.handshake.headers?.access_token ||
      client.handshake.auth?.token ||
      client.handshake.query?.token;

    if (!token) {
      console.log(`Client ${client.id} has no token`);
      client.disconnect();// Disconnect the client if no token is provided
      return;
    }
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      client.data.user = decoded;
      const userId = decoded.userId || decoded.sub;
      console.log(`Client connected: ${client.id}, user: ${userId}`);
      client.join(userId);// Join a room for notifications right after logging in
    } catch (error) {
      console.log(`Token verification failed for client ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // joinChat handler: catches errors from the service,
  // logs them, and emits a joinChatError event to the client.
  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody() data: { memberId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.user?.userId || client.data.user?.sub;
      if (!userId) {
        client.emit('joinChatError', { message: 'Phiên làm việc đã hết hạn. Vui lòng kết nối lại.' });
        return;
      }
      if (!data.memberId || data.memberId.toLowerCase() === 'null') {
        client.emit('joinChatError', { message: 'Tài khoản không tồn tại' });
        return;
      }
      const members = [userId, data.memberId];
      let chat;
      try {
        chat = await this.chatService.createChat(members);
      } catch (error) {
        console.error(`Chat creation failed: ${error.message}`);
        client.emit('joinChatError', { message: error.message });
        return;
      }
      
      // Let the client join the chat room by chat id
      client.join(chat.id);
      client.emit('joinedRoom', { chatId: chat.id, messages: chat.messages });
    } catch (error) {
      console.error(`Unexpected error in joinChat: ${error.message}`);
      client.emit('joinChatError', { message: 'Không thể tìm thấy đoạn hội thoại.' });
    }
  }

  // sendMessage handler remains similar: if an error occurs, it is logged and emitted.
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { chatId: string; text: string; timestamp?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const sender_id = client.data.user?.userId || client.data.user?.sub;
      if (!sender_id) {
        client.emit('sendMessageError', { message: 'Tài khoản chưa được xác thực, vui lòng đăng nhập lại sau.' });
        return;
      }
  
      // Check if the client has already joined the chat room.
      if (!data.chatId || !client.rooms.has(data.chatId)) {
        client.emit('sendMessageError', { message: 'Phải tham gia cuộc hội thoại để gửi tin.' });
        return;
      }
  
      const messagePayload = {
        sender_id,
        text: data.text,
        timestamp: data.timestamp || new Date().toISOString(),
      };
  
      const updatedChat = await this.chatService.createMessage(data.chatId, messagePayload);
  
      // Emit the new message to all clients in the chat room.
      client.to(data.chatId).emit('newMessage', messagePayload);
  
      // Notify other members (e.g. via personal rooms) in case they are not in the chat room.
      updatedChat.members.forEach((memberId) => {
        if (memberId !== sender_id) {
          client.to(memberId).emit('chatNotification', {
            chatId: data.chatId,
            newMessage: messagePayload,
          });
        }
      });
    } catch (error) {
      console.error(`Error in sendMessage: ${error.message}`);
      client.emit('sendMessageError', { message: error.message });
    }
  }
}