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

@WebSocketGateway({
  cors: { origin: '*' }, // Adjust for your production domain
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // When a websocket client wants to join a chat, create or retrieve it and join its room.
  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody() data: { vendorId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const chat = await this.chatService.createChat(data.vendorId, data.userId);
    client.join(chat.id);
    client.emit('joinedRoom', { chatId: chat.id, messages: chat.messages });
  }

  // When a message is sent, push it into the conversation and broadcast the updated conversation.
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { chatId: string; sender_id: string; text: string; timestamp?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const updatedChat = await this.chatService.createMessage(data.chatId, data);
    client.to(data.chatId).emit('messageReceived', updatedChat);
    client.emit('messageReceived', updatedChat);
  }
}