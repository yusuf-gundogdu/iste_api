import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatGateway } from '../conversations/chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentProvider } from './providers/payment.provider';

const COMMISSION_RATE = 0.02;

type PaymentStatus =
  | 'REQUESTED'
  | 'PROCESSING'
  | 'SECURED'
  | 'RELEASED'
  | 'FAILED'
  | 'REFUND_REQUESTED'
  | 'REFUNDED'
  | 'CANCELLED';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: PaymentProvider,
    private readonly notifications: NotificationsService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /** Usta sohbetten ödeme talebi oluşturur → hizmet PAYMENT_PENDING. */
  async createRequest(
    proUserId: string,
    input: {
      conversationId: string;
      amount: number;
      title?: string;
      note?: string;
    },
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: input.conversationId },
      include: {
        proProfile: {
          select: {
            id: true,
            userId: true,
            mainCategory: { select: { name: true } },
            user: { select: { firstName: true, lastName: true } },
          },
        },
        customer: { select: { firstName: true, lastName: true } },
        serviceRecord: true,
      },
    });
    if (!conversation) throw new NotFoundException('Sohbet bulunamadı');
    if (conversation.proProfile.userId !== proUserId) {
      throw new ForbiddenException('Ödeme talebini yalnız usta oluşturur');
    }
    const record = conversation.serviceRecord;
    if (!record) throw new NotFoundException('Hizmet kaydı bulunamadı');
    if (record.status === 'COMPLETED' || record.status === 'CANCELLED') {
      throw new BadRequestException(
        'Tamamlanmış/iptal edilmiş hizmet için ödeme talebi oluşturulamaz',
      );
    }

    const open = await this.prisma.payment.findFirst({
      where: {
        serviceRecordId: record.id,
        status: { in: ['REQUESTED', 'PROCESSING', 'SECURED'] },
      },
    });
    if (open) {
      throw new BadRequestException('Bu hizmet için açık bir ödeme zaten var');
    }

    const commission = Math.round(input.amount * COMMISSION_RATE * 100) / 100;
    const [payment, , requestMessage] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          conversationId: conversation.id,
          serviceRecordId: record.id,
          requestedByUserId: proUserId,
          amount: input.amount,
          commissionRate: COMMISSION_RATE,
          commissionAmount: commission,
          netAmount: input.amount - commission,
          note: input.note,
          events: { create: { status: 'REQUESTED' } },
        },
      }),
      this.prisma.serviceRecord.update({
        where: { id: record.id },
        data: {
          status: 'PAYMENT_PENDING',
          title: input.title ?? record.title,
          agreedAmount: input.amount,
        },
      }),
      // Sohbete bilgi mesajı düşer (bağlam kaybolmaz).
      this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: proUserId,
          type: 'TEXT',
          body:
            `💳 Ödeme talebi oluşturuldu: ₺${input.amount.toFixed(0)}` +
            ((input.title ?? record.title)
              ? ` · ${input.title ?? record.title}`
              : ''),
        },
      }),
    ]);

    // Sohbeti açık tutan müşteri bilgi mesajını canlı görür.
    this.chatGateway.emitToConversation(
      conversation.id,
      'message:new',
      requestMessage,
    );

    const proName =
      [conversation.proProfile.user.firstName, conversation.proProfile.user.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Usta';
    const customerName =
      [conversation.customer.firstName, conversation.customer.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Müşteri';
    await this.notifications.notify({
      userId: conversation.customerId,
      type: 'PAYMENT_REQUESTED',
      title: 'Ödeme talebi geldi',
      body: `₺${input.amount.toFixed(0)} tutarında güvenli ödeme talebi bekliyor.`,
      data: {
        conversationId: conversation.id,
        paymentId: payment.id,
        proName,
        proProfileId: conversation.proProfile.id,
        categoryName: conversation.proProfile.mainCategory.name,
        otherName: customerName,
      },
    });
    return this.serialize(payment.id);
  }

  /**
   * Escrow için ustayı iyzico alt üye işyeri olarak hazırlar.
   * subMerchantKey ProProfile'da bir kez üretilip saklanır (idempotent).
   * Sahte sağlayıcıda ya da usta IBAN'ı yoksa `undefined` döner — o zaman
   * ödeme marketplace kırılımı olmadan yürür (dev/mock akışı bozulmaz).
   *
   * NOT: gsmNumber/identityNumber üretimde gerçek usta KYC'sinden gelmelidir;
   * demoda sandbox-güvenli sabitler kullanılır.
   */
  private async resolveSubMerchant(
    ustaUserId: string,
    netAmount: number,
  ): Promise<{ key: string; netAmount: number } | undefined> {
    const usta = await this.prisma.proProfile.findUnique({
      where: { userId: ustaUserId },
      include: { user: true },
    });
    if (!usta?.iban) return undefined;

    let key = usta.subMerchantKey;
    if (!key) {
      const adres = [usta.district, usta.city].filter(Boolean).join(', ');
      // iyzico e-posta formatını (gerçek TLD) sıkı doğrular; demo seed
      // e-postaları (@ornek.iste gibi) reddedilir → geçerli fallback.
      const gecerliMail =
        usta.user.email && /^[^@\s]+@[^@\s]+\.(com|net|org|app|io)$/i.test(usta.user.email)
          ? usta.user.email
          : `usta-${ustaUserId.slice(0, 8)}@iste.app`;
      key = await this.provider.ensureSubMerchant({
        externalId: ustaUserId,
        name: `${usta.user.firstName ?? 'İŞTE'} ${usta.user.lastName ?? 'Usta'}`,
        contactName: usta.user.firstName ?? 'İŞTE',
        contactSurname: usta.user.lastName ?? 'Usta',
        iban: usta.iban,
        identityNumber: '31300864726', // TODO(üretim): gerçek TC (KYC)
        gsmNumber: '+905350000000', //    TODO(üretim): gerçek telefon (KYC)
        email: gecerliMail,
        address: adres.length >= 5 ? adres : 'Atakum, Samsun',
      });
      if (key) {
        await this.prisma.proProfile.update({
          where: { userId: ustaUserId },
          data: { subMerchantKey: key },
        });
      }
    }
    return key ? { key, netAmount } : undefined;
  }

  /** Müşteri "Güvenli Ödeme Yap" → 3DS oturumu başlar. */
  async checkout(customerId: string, paymentId: string, apiBaseUrl: string) {
    const payment = await this.byIdForUser(paymentId, customerId);
    if (payment.requestedByUserId === customerId) {
      throw new ForbiddenException('Kendi talebini ödeyemezsin');
    }
    if (payment.status !== 'REQUESTED' && payment.status !== 'FAILED') {
      throw new BadRequestException('Bu ödeme şu an başlatılamaz');
    }

    const subMerchant = await this.resolveSubMerchant(
      payment.requestedByUserId,
      Number(payment.netAmount),
    );

    const session = await this.provider.initCheckout({
      paymentId,
      amount: Number(payment.amount),
      buyerId: customerId,
      callbackUrl: `${apiBaseUrl}/payments/${paymentId}/callback`,
      subMerchant,
    });

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PROCESSING',
        paidByUserId: customerId,
        providerRef: session.providerRef,
        events: { create: { status: 'PROCESSING' } },
      },
    });
    return { checkoutUrl: session.checkoutUrl };
  }

  /** Sağlayıcı callback'i — başarıda SECURED, hizmet SCHEDULED. */
  async handleCallback(
    paymentId: string,
    payload: Record<string, unknown>,
  ): Promise<{ success: boolean }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment || payment.status !== 'PROCESSING') {
      return { success: false };
    }
    // providerRef eşleşmeyen callback sahtedir — durum değiştirilemez.
    // fake sağlayıcı 'ref', iyzico callback'i 'token' alanıyla döner.
    const callbackRef = payload['ref'] ?? payload['token'];
    if (!payment.providerRef || callbackRef !== payment.providerRef) {
      return { success: false };
    }

    const verification = await this.provider.verifyPayment({
      paymentId,
      providerRef: payment.providerRef ?? '',
      callbackPayload: payload,
    });

    if (verification.success) {
      const [, , securedMessage] = await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: 'SECURED',
            events: {
              create: { status: 'SECURED', note: 'Ödeme güvencede' },
            },
          },
        }),
        this.prisma.serviceRecord.update({
          where: { id: payment.serviceRecordId },
          data: { status: 'SCHEDULED' },
        }),
        this.prisma.message.create({
          data: {
            conversationId: payment.conversationId,
            senderId: payment.paidByUserId ?? payment.requestedByUserId,
            type: 'TEXT',
            body: '✅ Güvenli ödeme yapıldı — para güvencede, hizmet planlandı.',
          },
        }),
      ]);
      this.chatGateway.emitToConversation(
        payment.conversationId,
        'message:new',
        securedMessage,
      );
      const context = await this.notifyContext(payment.conversationId);
      await this.notifications.notify({
        userId: payment.requestedByUserId,
        type: 'PAYMENT_SECURED',
        title: 'Ödeme güvencede',
        body: 'Müşterin güvenli ödemeyi yaptı — hizmet planlandı.',
        data: {
          conversationId: payment.conversationId,
          paymentId: payment.id,
          ...(context ?? {}),
        },
      });
    } else {
      // Başarısız ödeme sahte "ödendi" üretmez (anayasa).
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'FAILED',
          events: {
            create: { status: 'FAILED', note: 'Paran çekilmedi' },
          },
        },
      });
    }
    return { success: verification.success };
  }

  /** Müşteri hizmeti onaylar → escrow ustaya aktarılır. */
  async release(customerId: string, paymentId: string) {
    const payment = await this.byIdForUser(paymentId, customerId);
    if (payment.paidByUserId !== customerId) {
      throw new ForbiddenException('Aktarımı yalnız ödeyen müşteri onaylar');
    }
    if (payment.status !== 'SECURED') {
      throw new BadRequestException('Ödeme güvencede değil');
    }
    const record = await this.prisma.serviceRecord.findUnique({
      where: { id: payment.serviceRecordId },
    });
    if (record?.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Önce ustanın hizmeti tamamlaması gerekiyor',
      );
    }

    await this.provider.releaseToPro({
      paymentId,
      providerRef: payment.providerRef ?? '',
    });
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'RELEASED',
        events: {
          create: { status: 'RELEASED', note: 'Ustaya aktarıldı' },
        },
      },
    });
    await this.notifications.notify({
      userId: payment.requestedByUserId,
      type: 'PAYMENT_RELEASED',
      title: 'Ödemen aktarıldı',
      body: 'Müşteri hizmeti onayladı — net kazancın banka hesabına aktarılıyor.',
      data: { paymentId },
    });
    return this.serialize(paymentId);
  }

  /** Müşteri iade/iptal talebi girer (dispute engine yok — yalnız iz).
   *  Ödeme henüz alınmadıysa (REQUESTED) talep doğrudan iptale çevrilir. */
  async requestRefund(customerId: string, paymentId: string, note?: string) {
    const payment = await this.byIdForUser(paymentId, customerId);

    if (payment.status === 'REQUESTED') {
      if (payment.conversation.customerId !== customerId) {
        throw new ForbiddenException('İptali yalnız müşteri yapabilir');
      }
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'CANCELLED',
          events: { create: { status: 'CANCELLED', note } },
        },
      });
      return this.serialize(paymentId, customerId);
    }

    if (payment.paidByUserId !== customerId) {
      throw new ForbiddenException('İade talebini yalnız ödeyen müşteri girer');
    }
    if (payment.status !== 'SECURED') {
      throw new BadRequestException('Yalnız güvencedeki ödeme iade edilebilir');
    }
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REFUND_REQUESTED',
        events: { create: { status: 'REFUND_REQUESTED', note } },
      },
    });
    await this.notifications.notify({
      userId: payment.requestedByUserId,
      type: 'REFUND_REQUESTED',
      title: 'İade talebi',
      body: 'Müşterin bir iade talebi girdi — inceleme başladı.',
      data: { paymentId },
    });
    return this.serialize(paymentId);
  }

  /** Kullanıcının ödeme listesi (müşteri + usta rolleri). */
  async listMine(userId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        // Sohbetin müşterisi henüz ödemediği (REQUESTED) talebi de görür;
        // aksi halde sohbetteki "Güvenli Ödeme Yap" açık talebi bulamaz.
        OR: [
          { paidByUserId: userId },
          { requestedByUserId: userId },
          { conversation: { customerId: userId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        serviceRecord: {
          select: {
            title: true,
            status: true,
            scheduledAt: true,
            address: true,
          },
        },
        conversation: {
          select: {
            customer: { select: { firstName: true, lastName: true } },
            proProfile: {
              select: {
                id: true,
                mainCategory: { select: { name: true } },
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    return payments.map((p) => this.toDto(p, userId));
  }

  async detail(userId: string, paymentId: string) {
    await this.byIdForUser(paymentId, userId);
    return this.serialize(paymentId, userId);
  }

  /**
   * Bildirim data'sının targetRoute bağlamı (usta adı + profil linki +
   * kategori + müşteri adı). Mobil bunu okuyup başlık/CTA üretir; boş gelirse
   * başlık 'Sohbet'e düşer ve usta profil linki gizlenir.
   */
  private async notifyContext(conversationId: string): Promise<{
    proName: string;
    proProfileId: string;
    categoryName: string;
    otherName: string;
  } | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        proProfile: {
          select: {
            id: true,
            mainCategory: { select: { name: true } },
            user: { select: { firstName: true, lastName: true } },
          },
        },
        customer: { select: { firstName: true, lastName: true } },
      },
    });
    if (!conversation) return null;
    return {
      proName:
        [
          conversation.proProfile.user.firstName,
          conversation.proProfile.user.lastName,
        ]
          .filter(Boolean)
          .join(' ')
          .trim() || 'Usta',
      proProfileId: conversation.proProfile.id,
      categoryName: conversation.proProfile.mainCategory.name,
      otherName:
        [conversation.customer.firstName, conversation.customer.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || 'Müşteri',
    };
  }

  private async byIdForUser(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        conversation: {
          select: {
            customerId: true,
            proProfile: { select: { userId: true } },
          },
        },
      },
    });
    if (!payment) throw new NotFoundException('Ödeme bulunamadı');
    const isParty =
      payment.conversation.customerId === userId ||
      payment.conversation.proProfile.userId === userId;
    if (!isParty) throw new ForbiddenException('Bu ödemeye erişimin yok');
    return payment;
  }

  private async serialize(paymentId: string, userId?: string) {
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: {
        serviceRecord: {
          select: {
            title: true,
            status: true,
            scheduledAt: true,
            address: true,
          },
        },
        conversation: {
          select: {
            customer: { select: { firstName: true, lastName: true } },
            proProfile: {
              select: {
                id: true,
                mainCategory: { select: { name: true } },
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    return this.toDto(payment, userId);
  }

  private toDto(
    payment: {
      id: string;
      conversationId: string;
      status: string;
      amount: unknown;
      commissionAmount: unknown;
      netAmount: unknown;
      note: string | null;
      requestedByUserId: string;
      paidByUserId: string | null;
      createdAt: Date;
      serviceRecord: {
        title: string | null;
        status: string;
        scheduledAt: Date | null;
        address: string | null;
      };
      conversation: {
        customer: { firstName: string | null; lastName: string | null };
        proProfile: {
          id: string;
          mainCategory: { name: string };
          user: { firstName: string | null; lastName: string | null };
        };
      };
      events: Array<{ status: string; note: string | null; createdAt: Date }>;
    },
    userId?: string,
  ) {
    return {
      id: payment.id,
      conversationId: payment.conversationId,
      status: payment.status as PaymentStatus,
      amount: Number(payment.amount),
      commissionAmount: Number(payment.commissionAmount),
      netAmount: Number(payment.netAmount),
      note: payment.note,
      title: payment.serviceRecord.title,
      serviceStatus: payment.serviceRecord.status,
      scheduledAt: payment.serviceRecord.scheduledAt,
      address: payment.serviceRecord.address,
      proProfileId: payment.conversation.proProfile.id,
      categoryName: payment.conversation.proProfile.mainCategory.name,
      proName:
        [
          payment.conversation.proProfile.user.firstName,
          payment.conversation.proProfile.user.lastName,
        ]
          .filter(Boolean)
          .join(' ') || 'Usta',
      customerName:
        [
          payment.conversation.customer.firstName,
          payment.conversation.customer.lastName?.[0],
        ]
          .filter(Boolean)
          .join(' ')
          .trim() || 'Müşteri',
      isRequester: userId ? payment.requestedByUserId === userId : undefined,
      createdAt: payment.createdAt,
      timeline: payment.events.map((e) => ({
        status: e.status,
        note: e.note,
        at: e.createdAt,
      })),
    };
  }
}
