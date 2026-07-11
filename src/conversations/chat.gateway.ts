import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../auth/auth.service';
import { ConversationsService } from './conversations.service';

interface AuthedSocket extends Socket {
  data: { userId?: string };
}

/**
 * Gerçek zamanlı sohbet kanalı. Bağlantı JWT ile doğrulanır
 * (handshake.auth.token); istemci sohbet odasına katılır ve
 * `message:new` olaylarını dinler.
 */
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection {
  constructor(
    private readonly jwt: JwtService,
    private readonly conversations: ConversationsService,
  ) {}

  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('ChatGateway');

  async handleConnection(client: AuthedSocket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      client.data.userId = payload.sub;
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('conversation:join')
  async join(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return { ok: false };
    try {
      await this.conversations.assertParticipant(data.conversationId, userId);
      await client.join(`conversation:${data.conversationId}`);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  @SubscribeMessage('message:send')
  async send(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    data: {
      conversationId: string;
      type: 'TEXT' | 'IMAGE' | 'LOCATION';
      body?: string;
      imageUrl?: string;
      latitude?: number;
      longitude?: number;
    },
  ) {
    const userId = client.data.userId;
    if (!userId) return { ok: false };
    try {
      const message = await this.conversations.send({
        conversationId: data.conversationId,
        senderId: userId,
        type: data.type,
        body: data.body,
        imageUrl: data.imageUrl,
        latitude: data.latitude,
        longitude: data.longitude,
      });
      this.emitToConversation(data.conversationId, 'message:new', message);
      return { ok: true, message };
    } catch (error) {
      this.logger.warn(`message:send başarısız: ${String(error)}`);
      return { ok: false };
    }
  }

  emitToConversation(conversationId: string, event: string, payload: unknown) {
    this.server.to(`conversation:${conversationId}`).emit(event, payload);
  }
}
