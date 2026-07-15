import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentProvider } from '../payments/providers/payment.provider';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly paymentProvider: PaymentProvider,
  ) {}

  async stats() {
    const [
      users,
      pros,
      verifiedPros,
      pendingVerification,
      conversations,
      payments,
      refundRequests,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.proProfile.count(),
      this.prisma.proProfile.count({
        where: { verificationStatus: 'VERIFIED' },
      }),
      this.prisma.proProfile.count({
        where: { verificationStatus: 'IN_REVIEW' },
      }),
      this.prisma.conversation.count(),
      this.prisma.payment.aggregate({
        where: { status: { in: ['SECURED', 'RELEASED'] } },
        _sum: { amount: true, commissionAmount: true },
        _count: true,
      }),
      this.prisma.payment.count({ where: { status: 'REFUND_REQUESTED' } }),
    ]);

    return {
      users,
      pros,
      verifiedPros,
      pendingVerification,
      conversations,
      paymentsCount: payments._count,
      paymentsVolume: Number(payments._sum.amount ?? 0),
      commissionTotal: Number(payments._sum.commissionAmount ?? 0),
      refundRequests,
    };
  }

  /** Doğrulama kuyruğu — incelemedeki vitrinler. */
  verificationQueue() {
    return this.prisma.proProfile.findMany({
      where: { verificationStatus: 'IN_REVIEW' },
      orderBy: { updatedAt: 'asc' },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        mainCategory: { select: { name: true } },
        subServices: { include: { subService: { select: { name: true } } } },
        regions: true,
      },
    });
  }

  /** Vitrini onayla/reddet — onayda yayına alınır, kullanıcı bilgilenir. */
  async resolveVerification(proProfileId: string, approve: boolean) {
    const profile = await this.prisma.proProfile.findUnique({
      where: { id: proProfileId },
      select: { userId: true, verificationStatus: true },
    });
    if (!profile) throw new NotFoundException('Vitrin bulunamadı');
    if (profile.verificationStatus !== 'IN_REVIEW') {
      throw new BadRequestException('Bu vitrin incelemede değil');
    }

    const updated = await this.prisma.proProfile.update({
      where: { id: proProfileId },
      data: {
        verificationStatus: approve ? 'VERIFIED' : 'REJECTED',
        // İncelemedeki belgeler de aynı kararla sonuçlanır — mobil
        // paneldeki "n belge incelemede" sayacı asılı kalmasın.
        documents: {
          updateMany: {
            where: { status: 'IN_REVIEW' },
            data: { status: approve ? 'APPROVED' : 'REJECTED' },
          },
        },
        isPublished: approve,
      },
      select: { id: true, verificationStatus: true, isPublished: true },
    });

    await this.notifications.notify({
      userId: profile.userId,
      type: 'VERIFICATION_RESULT',
      title: approve ? 'Vitrinin yayında!' : 'Vitrinin onaylanmadı',
      body: approve
        ? 'Doğrulama tamamlandı — artık müşteriler seni keşfedebilir.'
        : 'Bilgilerini güncelleyip tekrar gönderebilirsin.',
    });
    return updated;
  }

  /** İade kuyruğu. */
  refundQueue() {
    return this.prisma.payment.findMany({
      where: { status: 'REFUND_REQUESTED' },
      orderBy: { updatedAt: 'asc' },
      include: {
        serviceRecord: { select: { title: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  /** İadeyi sonuçlandır: onayda sağlayıcı iadesi + REFUNDED. */
  async resolveRefund(paymentId: string, approve: boolean) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Ödeme bulunamadı');
    if (payment.status !== 'REFUND_REQUESTED') {
      throw new BadRequestException('Bu ödemede iade talebi yok');
    }

    if (approve) {
      await this.paymentProvider.refund({
        paymentId,
        providerRef: payment.providerRef ?? '',
        amount: Number(payment.amount),
      });
    }
    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: approve ? 'REFUNDED' : 'SECURED',
        events: {
          create: {
            status: approve ? 'REFUNDED' : 'SECURED',
            note: approve ? 'İade edildi' : 'İade talebi reddedildi',
          },
        },
      },
    });

    if (payment.paidByUserId) {
      await this.notifications.notify({
        userId: payment.paidByUserId,
        type: 'REFUND_REQUESTED',
        title: approve ? 'İaden tamamlandı' : 'İade talebin reddedildi',
        body: approve
          ? 'Ödemen iade edildi; kartına yansıması birkaç gün sürebilir.'
          : 'İade talebin incelendi ve uygun bulunmadı.',
        data: { paymentId },
      });
    }
    return updated;
  }

  /** Yorum moderasyonu. */
  latestReviews() {
    return this.prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        customer: { select: { firstName: true, lastName: true } },
        proProfile: {
          select: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async deleteReview(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Yorum bulunamadı');
    await this.prisma.review.delete({ where: { id: reviewId } });
    return { deleted: true };
  }
}
