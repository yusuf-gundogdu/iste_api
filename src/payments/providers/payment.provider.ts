/**
 * Ödeme sağlayıcı soyutlaması. Üretimde iyzico Pazaryeri (escrow'lu),
 * geliştirmede FakePaymentProvider kullanılır. Mobil taraf yalnız
 * [checkoutUrl]'i WebView'de açar — kart verisi uygulamaya girmez.
 */
export interface CheckoutSession {
  /** 3DS/ödeme sayfası URL'i (WebView'de açılır). */
  checkoutUrl: string;
  /** Sağlayıcı referansı. */
  providerRef: string;
}

export abstract class PaymentProvider {
  /** Ödeme oturumu başlatır (müşteri "Güvenli Ödeme Yap" dedi). */
  abstract initCheckout(input: {
    paymentId: string;
    amount: number;
    buyerId: string;
    callbackUrl: string;
  }): Promise<CheckoutSession>;

  /** Callback sonrası ödemeyi doğrular (başarılı mı?). */
  abstract verifyPayment(input: {
    paymentId: string;
    providerRef: string;
    callbackPayload: Record<string, unknown>;
  }): Promise<{ success: boolean }>;

  /** Escrow'daki tutarı ustaya aktarır (hizmet onayı sonrası). */
  abstract releaseToPro(input: {
    paymentId: string;
    providerRef: string;
  }): Promise<void>;

  /** İadeyi gerçekleştirir. */
  abstract refund(input: {
    paymentId: string;
    providerRef: string;
  }): Promise<void>;
}
