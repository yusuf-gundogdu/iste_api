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

/** Ustayı iyzico Pazaryeri alt üye işyeri (subMerchant) yapmak için gerekenler. */
export interface SubMerchantInput {
  /** Uygulama tarafı sabit kimlik (usta userId) — iyzico eşlemesi. */
  externalId: string;
  name: string;
  contactName: string;
  contactSurname: string;
  iban: string;
  /** TC kimlik no (PERSONAL alt üye zorunlu). */
  identityNumber: string;
  gsmNumber: string;
  email: string;
  address: string;
}

export abstract class PaymentProvider {
  /**
   * Ustayı ödeme sağlayıcıda alt üye işyeri (escrow alıcısı) olarak kaydeder;
   * saklanacak subMerchantKey döner. Marketplace olmayan sağlayıcıda `null`.
   */
  abstract ensureSubMerchant(input: SubMerchantInput): Promise<string | null>;

  /** Ödeme oturumu başlatır (müşteri "Güvenli Ödeme Yap" dedi). */
  abstract initCheckout(input: {
    paymentId: string;
    amount: number;
    buyerId: string;
    callbackUrl: string;
    /** Escrow: ustanın alt üye anahtarı + ustaya düşecek net tutar. */
    subMerchant?: { key: string; netAmount: number };
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

  /** İadeyi gerçekleştirir (iyzico iade için tutarı zorunlu ister). */
  abstract refund(input: {
    paymentId: string;
    providerRef: string;
    amount: number;
  }): Promise<void>;
}
