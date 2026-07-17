/**
 * IyzicoPaymentProvider regresyon testi. iyzipay SDK mock'lanır; amaç gerçek
 * iyzico sandbox'ında bulunan 3 hatanın geri gelmesini engellemek:
 *   1) initCheckout sepet kırılımına subMerchantKey + subMerchantPrice koymalı
 *      (marketplace hesabında yoksa errorCode 5077).
 *   2) releaseToPro 'approval' kaynağını kullanmalı ('approvalRequest' YOK).
 *   3) refund 'price' göndermeli (yoksa errorCode 5004).
 */

const cbOk =
  (result: Record<string, unknown>) =>
  (_req: unknown, cb: (e: unknown, r: unknown) => void) =>
    cb(null, result);

const mockCheckoutCreate = jest.fn(
  cbOk({ status: 'success', paymentPageUrl: 'https://pay', token: 'TOK' }),
);
const mockSubMerchantCreate = jest.fn(
  cbOk({ status: 'success', subMerchantKey: 'SUBKEY-123' }),
);
// Provider önce mevcut subMerchant'ı retrieve eder; yoksa create eder.
// Mock retrieve "yok" (failure) döner → create yoluna düşer.
const mockSubMerchantRetrieve = jest.fn(cbOk({ status: 'failure' }));
const mockRetrieve = jest.fn(
  cbOk({
    status: 'success',
    paymentStatus: 'SUCCESS',
    itemTransactions: [{ paymentTransactionId: 'TX-1', paidPrice: 350 }],
  }),
);
const mockApprovalCreate = jest.fn(cbOk({ status: 'success' }));
const mockRefundCreate = jest.fn(cbOk({ status: 'success' }));

jest.mock('iyzipay', () => {
  const Iyzipay = function (this: Record<string, unknown>) {
    this.checkoutFormInitialize = { create: mockCheckoutCreate };
    this.subMerchant = {
      create: mockSubMerchantCreate,
      retrieve: mockSubMerchantRetrieve,
    };
    this.checkoutForm = { retrieve: mockRetrieve };
    this.approval = { create: mockApprovalCreate };
    this.refund = { create: mockRefundCreate };
  } as unknown as {
    (): void;
    LOCALE: Record<string, string>;
    CURRENCY: Record<string, string>;
    PAYMENT_GROUP: Record<string, string>;
    BASKET_ITEM_TYPE: Record<string, string>;
    SUB_MERCHANT_TYPE: Record<string, string>;
  };
  Iyzipay.LOCALE = { TR: 'tr' };
  Iyzipay.CURRENCY = { TRY: 'TRY' };
  Iyzipay.PAYMENT_GROUP = { PRODUCT: 'PRODUCT' };
  Iyzipay.BASKET_ITEM_TYPE = { PHYSICAL: 'PHYSICAL' };
  Iyzipay.SUB_MERCHANT_TYPE = { PERSONAL: 'PERSONAL' };
  return Iyzipay;
});

// require mock kurulduktan sonra import edilmeli
import { IyzicoPaymentProvider } from './iyzico-payment.provider';

describe('IyzicoPaymentProvider (marketplace escrow)', () => {
  let provider: IyzicoPaymentProvider;
  beforeEach(() => {
    jest.clearAllMocks();
    provider = new IyzicoPaymentProvider();
  });

  it('ensureSubMerchant subMerchantKey döner', async () => {
    const key = await provider.ensureSubMerchant({
      externalId: 'usta-1',
      name: 'Okan Yılmaz',
      contactName: 'Okan',
      contactSurname: 'Yılmaz',
      iban: 'TR180006200119000006672315',
      identityNumber: '11111111111',
      gsmNumber: '+905350000000',
      email: 'usta@iste.app',
      address: 'Atakum, Samsun',
    });
    expect(key).toBe('SUBKEY-123');
    expect(mockSubMerchantCreate).toHaveBeenCalledTimes(1);
  });

  it('initCheckout sepet kırılımına subMerchantKey + subMerchantPrice koyar (5077 önlemi)', async () => {
    const session = await provider.initCheckout({
      paymentId: 'p1',
      amount: 350,
      buyerId: 'buyer-1',
      callbackUrl: 'https://iste.app/cb',
      subMerchant: { key: 'SUBKEY-123', netAmount: 343 },
    });
    expect(session).toEqual({ checkoutUrl: 'https://pay', providerRef: 'TOK' });
    const req = mockCheckoutCreate.mock.calls[0][0] as {
      basketItems: { subMerchantKey?: string; subMerchantPrice?: string }[];
    };
    expect(req.basketItems[0].subMerchantKey).toBe('SUBKEY-123');
    expect(req.basketItems[0].subMerchantPrice).toBe('343.00');
  });

  it('subMerchant verilmezse kırılım eklenmez (fake/IBAN yok akışı)', async () => {
    await provider.initCheckout({
      paymentId: 'p2',
      amount: 100,
      buyerId: 'b',
      callbackUrl: 'https://iste.app/cb',
    });
    const req = mockCheckoutCreate.mock.calls[0][0] as {
      basketItems: { subMerchantKey?: string }[];
    };
    expect(req.basketItems[0].subMerchantKey).toBeUndefined();
  });

  it('releaseToPro approval kaynağını kullanır (approvalRequest DEĞİL)', async () => {
    await provider.releaseToPro({ paymentId: 'p1', providerRef: 'TOK' });
    expect(mockApprovalCreate).toHaveBeenCalledTimes(1);
    const req = mockApprovalCreate.mock.calls[0][0] as {
      paymentTransactionId: string;
    };
    expect(req.paymentTransactionId).toBe('TX-1');
  });

  it('refund price gönderir (5004 önlemi)', async () => {
    await provider.refund({ paymentId: 'p1', providerRef: 'TOK', amount: 350 });
    expect(mockRefundCreate).toHaveBeenCalledTimes(1);
    const req = mockRefundCreate.mock.calls[0][0] as { price: string };
    expect(req.price).toBe('350.00');
  });
});
