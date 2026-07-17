import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type NotificationType =
  | 'NEW_CONVERSATION'
  | 'PAYMENT_REQUESTED'
  | 'PAYMENT_SECURED'
  | 'PAYMENT_RELEASED'
  | 'REFUND_REQUESTED'
  | 'REVIEW_RECEIVED'
  | 'VERIFICATION_RESULT'
  | 'SUPPORT_UPDATED';

/**
 * Push gönderici soyutlaması. userId + başlık/gövde (+ opsiyonel data) alır;
 * userId→cihaz token çözümü sender içinde yapılır. DB bildirimi her durumda kalıcı.
 */
export abstract class PushSender {
  abstract send(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void>;
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
  private readonly logger = new Logger('Notifications');

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
      await this.push.send(
        input.userId,
        input.title,
        input.body,
        input.data,
      );
    } catch (err) {
      // push başarısızlığı sessiz geçilir; DB bildirimi yeterli.
      this.logger.warn(
        `Push gönderilemedi (${input.userId}): ${String(err)}`,
      );
    }
  }

  /**
   * FCM cihaz token'ını kaydeder/günceller. Token global tekildir; başka
   * kullanıcıya bağlıysa (cihaz el değiştirdi / yeniden giriş) userId güncellenir.
   */
  async registerDeviceToken(userId: string, token: string, platform: string) {
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
    });
    return { ok: true };
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

  /** Prototip 'Temizle': kullanıcının tüm bildirimlerini siler. */
  async clearAll(userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { userId },
    });
    return { cleared: result.count };
  }
}
