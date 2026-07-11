import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  type: 'TEXT' | 'IMAGE' | 'LOCATION';
  body?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
}

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Müşteri → usta: mevcut sohbeti getirir ya da açar. */
  async getOrCreate(customerId: string, proProfileId: string) {
    const pro = await this.prisma.proProfile.findUnique({
      where: { id: proProfileId },
      select: { userId: true, isPublished: true, verificationStatus: true },
    });
    if (!pro || !pro.isPublished || pro.verificationStatus !== 'VERIFIED') {
      throw new NotFoundException('Usta bulunamadı');
    }
    if (pro.userId === customerId) {
      throw new BadRequestException('Kendinle sohbet başlatamazsın');
    }

    const existing = await this.prisma.conversation.findUnique({
      where: { customerId_proProfileId: { customerId, proProfileId } },
      select: { id: true },
    });

    const conversation = await this.prisma.conversation.upsert({
      where: {
        customerId_proProfileId: { customerId, proProfileId },
      },
      update: {},
      // Hizmet kaydı sohbetle birlikte DISCUSSING olarak türer.
      create: { customerId, proProfileId, serviceRecord: { create: {} } },
      include: this.conversationInclude(),
    });

    if (!existing) {
      await this.notifications.notify({
        userId: pro.userId,
        type: 'NEW_CONVERSATION',
        title: 'Yeni müşteri sohbeti',
        body: 'Bir müşteri seninle sohbet başlattı — hemen yanıtla.',
        data: { conversationId: conversation.id },
      });
    }
    return conversation;
  }

  /** Kullanıcının tüm sohbetleri (müşteri VE usta rolüyle). */
  async listMine(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ customerId: userId }, { proProfile: { userId } }],
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        ...this.conversationInclude(),
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const withUnread = await Promise.all(
      conversations.map(async (conversation) => ({
        ...conversation,
        unreadCount: await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            readAt: null,
          },
        }),
      })),
    );
    return withUnread;
  }

  /** Sohbet mesajları (eski→yeni); yalnız taraflar erişir. */
  async messages(conversationId: string, userId: string, cursor?: string) {
    await this.assertParticipant(conversationId, userId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      ...(cursor
        ? { cursor: { id: cursor }, skip: 1, take: 50 }
        : { take: 500 }),
    });

    // Karşı tarafın mesajlarını okundu işaretle.
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return messages;
  }

  async send(input: SendMessageInput) {
    await this.assertParticipant(input.conversationId, input.senderId);

    if (input.type === 'TEXT' && !input.body?.trim()) {
      throw new BadRequestException('Mesaj boş olamaz');
    }
    if (input.type === 'IMAGE' && !input.imageUrl) {
      throw new BadRequestException('Görsel gerekli');
    }
    if (
      input.type === 'LOCATION' &&
      (input.latitude == null || input.longitude == null)
    ) {
      throw new BadRequestException('Konum gerekli');
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId: input.conversationId,
          senderId: input.senderId,
          type: input.type,
          body: input.body?.trim() ?? '',
          imageUrl: input.imageUrl,
          latitude: input.latitude,
          longitude: input.longitude,
        },
      }),
      this.prisma.conversation.update({
        where: { id: input.conversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);
    return message;
  }

  async assertParticipant(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        customerId: true,
        proProfile: { select: { userId: true } },
      },
    });
    if (!conversation) {
      throw new NotFoundException('Sohbet bulunamadı');
    }
    if (
      conversation.customerId !== userId &&
      conversation.proProfile.userId !== userId
    ) {
      throw new ForbiddenException('Bu sohbete erişimin yok');
    }
    return conversation;
  }

  private conversationInclude() {
    return {
      serviceRecord: { select: { status: true, title: true } },
      customer: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
      proProfile: {
        select: {
          id: true,
          userId: true,
          mainCategory: { select: { name: true, slug: true } },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      },
    } as const;
  }
}
