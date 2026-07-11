import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type NotificationType =
  | 'NEW_CONVERSATION'
  | 'PAYMENT_REQUESTED'
  | 'PAYMENT_SECURED'
  | 'PAYMENT_RELEASED'
  | 'REFUND_REQUESTED'
  | 'REVIEW_RECEIVED'
  | 'VERIFICATION_RESULT';

/**
 * Push gönderici soyutlaması. FCM anahtarları (google-services) eklenince
 * FirebasePushSender yazılır; şimdilik log. DB bildirimi her durumda kalıcı.
 */
export abstract class PushSender {
  abstract send(userId: string, title: string, body: string): Promise<void>;
}

@Injectable()
export class ConsolePushSender extends PushSender {
  private readonly logger = new Logger('Push');
  send(userId: string, title: string, body: string): Promise<void> {
    this.logger.log(`→ ${userId}: ${title} — ${body}`);
    return Promise.resolve();
  }
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushSender,
  ) {}

  /** Bildirim oluşturur; push dener ama akışı asla bloklamaz. */
  async notify(input: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, string>;
  }) {
    await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data,
      },
    });
    try {
      await this.push.send(input.userId, input.title, input.body);
    } catch {
      // push başarısızlığı sessiz geçilir; DB bildirimi yeterli.
    }
  }

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
