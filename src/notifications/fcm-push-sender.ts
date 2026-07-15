import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import {
  App,
  ServiceAccount,
  cert,
  getApp,
  initializeApp,
} from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PrismaService } from '../prisma/prisma.service';
import { PushSender } from './notifications.service';

const APP_NAME = 'iste-push';

/**
 * Gerçek FCM gönderici. `FIREBASE_SERVICE_ACCOUNT` env'indeki servis hesabı
 * JSON'unu okuyup firebase-admin'i başlatır; bir kullanıcının tüm cihaz
 * token'larına multicast gönderir. Geçersiz token'lar DB'den silinir.
 */
@Injectable()
export class FcmPushSender extends PushSender {
  private readonly logger = new Logger('Push');
  private app?: App;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /** firebase-admin uygulamasını yalnız bir kez başlatır (idempotent). */
  private getApp(): App {
    if (this.app) return this.app;
    try {
      // Zaten başlatılmışsa (hot-reload / tekrar) yeniden kullan.
      this.app = getApp(APP_NAME);
      return this.app;
    } catch {
      // Yok → aşağıda başlat.
    }
    const value = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!value) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT tanımsız');
    }
    // Değer ya doğrudan JSON içeriği (Koyeb gibi dosya mount edilemeyen
    // ortamlarda env'e gömülür) ya da bir dosya yoludur (yerel geliştirme).
    const raw = value.trimStart().startsWith('{')
      ? value
      : readFileSync(
          isAbsolute(value) ? value : resolve(process.cwd(), value),
          'utf8',
        );
    const serviceAccount = JSON.parse(raw) as ServiceAccount;
    this.app = initializeApp(
      { credential: cert(serviceAccount) },
      APP_NAME,
    );
    return this.app;
  }

  async send(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const devices = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });
    if (devices.length === 0) return;

    const tokens = devices.map((d) => d.token);
    const response = await getMessaging(this.getApp()).sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
    });

    if (response.failureCount === 0) return;

    // Geçersiz (silinmiş/kayıtsız) token'ları temizle.
    const stale: string[] = [];
    response.responses.forEach((res, i) => {
      if (res.success) return;
      const code = res.error?.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/invalid-argument'
      ) {
        stale.push(tokens[i]);
      } else {
        this.logger.warn(
          `FCM gönderim hatası (${tokens[i].slice(0, 12)}…): ${code ?? 'bilinmeyen'}`,
        );
      }
    });
    if (stale.length > 0) {
      await this.prisma.deviceToken.deleteMany({
        where: { token: { in: stale } },
      });
      this.logger.log(`${stale.length} geçersiz token silindi (${userId})`);
    }
  }
}
