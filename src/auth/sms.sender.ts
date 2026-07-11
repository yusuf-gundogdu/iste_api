import { Injectable, Logger } from '@nestjs/common';

/**
 * SMS gönderici soyutlaması. Üretimde gerçek sağlayıcı (Netgsm/İleti Merkezi
 * vb.) bu arayüzü uygular; geliştirmede kod konsola yazılır.
 */
export abstract class SmsSender {
  abstract sendOtp(phone: string, code: string): Promise<void>;
}

@Injectable()
export class ConsoleSmsSender extends SmsSender {
  private readonly logger = new Logger('SMS');

  async sendOtp(phone: string, code: string): Promise<void> {
    this.logger.log(`OTP → ${phone}: ${code}`);
    return Promise.resolve();
  }
}
