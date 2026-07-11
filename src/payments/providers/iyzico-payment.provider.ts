import { Injectable, NotImplementedException } from '@nestjs/common';
import { PaymentProvider, CheckoutSession } from './payment.provider';

/**
 * iyzico Pazaryeri entegrasyon iskeleti.
 *
 * Aktifleştirme adımları (İYZICO_API_KEY + IYZICO_SECRET env'e girilince):
 * 1. `npm i iyzipay` — resmi Node SDK.
 * 2. initCheckout → CheckoutFormInitialize.create (paymentGroup: PRODUCT,
 *    itemTransactions'da subMerchantKey + subMerchantPrice=netAmount).
 * 3. verifyPayment → CheckoutForm.retrieve(token) → paymentStatus SUCCESS.
 * 4. releaseToPro → /payment/iyzipos/item/approve (escrow onayı).
 * 5. refund → /payment/refund.
 * Usta onboarding'i (subMerchant oluşturma) S18 admin onayında yapılır.
 */
@Injectable()
export class IyzicoPaymentProvider extends PaymentProvider {
  initCheckout(): Promise<CheckoutSession> {
    throw new NotImplementedException(
      'iyzico anahtarları tanımlı ama SDK entegrasyonu henüz aktifleştirilmedi',
    );
  }

  verifyPayment(): Promise<{ success: boolean }> {
    throw new NotImplementedException();
  }

  releaseToPro(): Promise<void> {
    throw new NotImplementedException();
  }

  refund(): Promise<void> {
    throw new NotImplementedException();
  }
}
