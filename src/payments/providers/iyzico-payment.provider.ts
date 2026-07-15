import { Injectable, Logger } from '@nestjs/common';
import { PaymentProvider, CheckoutSession } from './payment.provider';

// iyzipay resmi Node SDK (JS) — TS tipi yok, require ile alınır.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Iyzipay = require('iyzipay');

type IyziCallback = (err: unknown, result: IyziResult) => void;
interface IyziResult {
  status: string; // 'success' | 'failure'
  errorMessage?: string;
  paymentPageUrl?: string;
  token?: string;
  paymentStatus?: string; // 'SUCCESS' ...
  paymentId?: string;
  itemTransactions?: { paymentTransactionId: string }[];
  [k: string]: unknown;
}

/**
 * iyzico Pazaryeri (Checkout Form + escrow) entegrasyonu.
 *
 * Aktifleşme: `IYZICO_API_KEY` env tanımlıysa PaymentsModule bu provider'ı
 * seçer (yoksa FakePaymentProvider). Sandbox için:
 *   IYZICO_API_KEY=sandbox-...
 *   IYZICO_SECRET=sandbox-...
 *   IYZICO_BASE_URL=https://sandbox-api.iyzipay.com   (varsayılan)
 *
 * Akış: initCheckout → hosted ödeme sayfası (mobil WebView) → müşteri kart
 * girer/3DS → callbackUrl'e token döner → verifyPayment (retrieve) → SUCCESS.
 * Escrow: releaseToPro hizmet onayında iyzico approvalRequest ile ustaya
 * aktarır; refund iade eder.
 */
@Injectable()
export class IyzicoPaymentProvider extends PaymentProvider {
  private readonly log = new Logger(IyzicoPaymentProvider.name);
  private readonly iyzipay = new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY,
    secretKey: process.env.IYZICO_SECRET,
    uri: process.env.IYZICO_BASE_URL ?? 'https://sandbox-api.iyzipay.com',
  });

  private call(fn: (cb: IyziCallback) => void): Promise<IyziResult> {
    return new Promise((resolve, reject) => {
      fn((err, result) => (err ? reject(err) : resolve(result)));
    });
  }

  async initCheckout(input: {
    paymentId: string;
    amount: number;
    buyerId: string;
    callbackUrl: string;
  }): Promise<CheckoutSession> {
    const price = input.amount.toFixed(2);
    // buyer/adres alanları iyzico tarafından zorunlu; sandbox için güvenli
    // varsayılanlar. Üretimde gerçek müşteri bilgisiyle beslenir.
    const result = await this.call((cb) =>
      this.iyzipay.checkoutFormInitialize.create(
        {
          locale: Iyzipay.LOCALE.TR,
          conversationId: input.paymentId,
          price,
          paidPrice: price,
          currency: Iyzipay.CURRENCY.TRY,
          basketId: input.paymentId,
          paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
          callbackUrl: input.callbackUrl,
          enabledInstallments: [1],
          buyer: {
            id: input.buyerId,
            name: 'İŞTE',
            surname: 'Müşteri',
            gsmNumber: '+905350000000',
            email: 'musteri@iste.app',
            identityNumber: '11111111111',
            registrationAddress: 'Atakum, Samsun',
            ip: '85.34.78.112',
            city: 'Samsun',
            country: 'Turkey',
          },
          shippingAddress: {
            contactName: 'İŞTE Müşteri',
            city: 'Samsun',
            country: 'Turkey',
            address: 'Atakum, Samsun',
          },
          billingAddress: {
            contactName: 'İŞTE Müşteri',
            city: 'Samsun',
            country: 'Turkey',
            address: 'Atakum, Samsun',
          },
          basketItems: [
            {
              id: input.paymentId,
              name: 'İŞTE hizmet ödemesi',
              category1: 'Hizmet',
              itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
              price,
            },
          ],
        },
        cb,
      ),
    );
    if (
      result.status !== 'success' ||
      !result.paymentPageUrl ||
      !result.token
    ) {
      this.log.error(`iyzico initCheckout başarısız: ${result.errorMessage}`);
      throw new Error(result.errorMessage ?? 'iyzico ödeme başlatılamadı');
    }
    // providerRef = checkout token (verify/retrieve için).
    return { checkoutUrl: result.paymentPageUrl, providerRef: result.token };
  }

  async verifyPayment(input: {
    paymentId: string;
    providerRef: string;
    callbackPayload: Record<string, unknown>;
  }): Promise<{ success: boolean }> {
    const result = await this.call((cb) =>
      this.iyzipay.checkoutForm.retrieve(
        {
          locale: Iyzipay.LOCALE.TR,
          conversationId: input.paymentId,
          token: input.providerRef,
        },
        cb,
      ),
    );
    const ok =
      result.status === 'success' && result.paymentStatus === 'SUCCESS';
    if (!ok) {
      this.log.warn(
        `iyzico verify: status=${result.status} paymentStatus=${result.paymentStatus} ${result.errorMessage ?? ''}`,
      );
    }
    return { success: ok };
  }

  async releaseToPro(input: {
    paymentId: string;
    providerRef: string;
  }): Promise<void> {
    // Escrow onayı: ödemedeki her itemTransaction için approvalRequest.
    const form = await this.call((cb) =>
      this.iyzipay.checkoutForm.retrieve(
        {
          locale: Iyzipay.LOCALE.TR,
          conversationId: input.paymentId,
          token: input.providerRef,
        },
        cb,
      ),
    );
    for (const tx of form.itemTransactions ?? []) {
      await this.call((cb) =>
        this.iyzipay.approvalRequest.create(
          {
            locale: Iyzipay.LOCALE.TR,
            conversationId: input.paymentId,
            paymentTransactionId: tx.paymentTransactionId,
          },
          cb,
        ),
      );
    }
  }

  async refund(input: {
    paymentId: string;
    providerRef: string;
  }): Promise<void> {
    const form = await this.call((cb) =>
      this.iyzipay.checkoutForm.retrieve(
        {
          locale: Iyzipay.LOCALE.TR,
          conversationId: input.paymentId,
          token: input.providerRef,
        },
        cb,
      ),
    );
    for (const tx of form.itemTransactions ?? []) {
      await this.call((cb) =>
        this.iyzipay.refund.create(
          {
            locale: Iyzipay.LOCALE.TR,
            conversationId: input.paymentId,
            paymentTransactionId: tx.paymentTransactionId,
            currency: Iyzipay.CURRENCY.TRY,
            ip: '85.34.78.112',
          },
          cb,
        ),
      );
    }
  }
}
