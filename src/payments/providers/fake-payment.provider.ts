import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentProvider, CheckoutSession } from './payment.provider';

/**
 * Geliştirme/test sağlayıcısı: gerçek para akışı yok. 3DS sayfası backend
 * tarafından render edilir (GET /payments/:id/fake-3ds); "Onayla" callback'i
 * success=1 ile çağırır. iyzico anahtarları girildiğinde yerini
 * IyzicoPaymentProvider alır.
 */
@Injectable()
export class FakePaymentProvider extends PaymentProvider {
  initCheckout(input: {
    paymentId: string;
    amount: number;
    buyerId: string;
    callbackUrl: string;
  }): Promise<CheckoutSession> {
    const providerRef = `fake-${randomUUID()}`;
    // Callback URL sayfaya taşınmaz (XSS yüzeyi) — 3DS sayfası kendi
    // callback'ini sabit kalıptan üretir; ref doğrulama anahtarıdır.
    const checkoutUrl = `/api/v1/payments/${input.paymentId}/fake-3ds?ref=${providerRef}`;
    return Promise.resolve({ checkoutUrl, providerRef });
  }

  verifyPayment(input: {
    paymentId: string;
    providerRef: string;
    callbackPayload: Record<string, unknown>;
  }): Promise<{ success: boolean }> {
    return Promise.resolve({
      success: input.callbackPayload['success'] === '1',
    });
  }

  releaseToPro(): Promise<void> {
    return Promise.resolve();
  }

  refund(): Promise<void> {
    return Promise.resolve();
  }
}
