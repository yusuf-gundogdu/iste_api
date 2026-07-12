import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateReviewInput {
  conversationId: string;
  rating: number;
  communication?: number;
  punctuality?: number;
  workmanship?: number;
  body?: string;
  photoUrl?: string;
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Müşteri tamamlanan hizmete yorum bırakır (bir kez). */
  async create(customerId: string, input: CreateReviewInput) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: input.conversationId },
      include: {
        serviceRecord: { include: { review: true, payments: true } },
        proProfile: { select: { id: true, userId: true } },
      },
    });
    if (!conversation) throw new NotFoundException('Sohbet bulunamadı');
    if (conversation.customerId !== customerId) {
      throw new ForbiddenException('Yorumu yalnız müşteri bırakır');
    }
    const record = conversation.serviceRecord;
    if (!record) throw new NotFoundException('Hizmet kaydı bulunamadı');
    if (record.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Yorum yalnız tamamlanan hizmet sonrası bırakılır',
      );
    }
    if (record.review) {
      throw new BadRequestException('Bu hizmete zaten yorum bıraktın');
    }

    // Uygulama içi ödeme (güvencede/aktarıldı) = doğrulanmış işlem.
    const isVerified = record.payments.some(
      (p) => p.status === 'SECURED' || p.status === 'RELEASED',
    );

    const review = await this.prisma.review.create({
      data: {
        serviceRecordId: record.id,
        proProfileId: conversation.proProfile.id,
        customerId,
        rating: input.rating,
        communication: input.communication,
        punctuality: input.punctuality,
        workmanship: input.workmanship,
        body: input.body?.trim() ?? '',
        photoUrl: input.photoUrl,
        isVerified,
      },
    });
    await this.notifications.notify({
      userId: conversation.proProfile.userId,
      type: 'REVIEW_RECEIVED',
      title: 'Yeni değerlendirme',
      body: `${input.rating} yıldızlı bir yorum aldın${isVerified ? ' (doğrulanmış işlem)' : ''}.`,
      data: { reviewId: review.id },
    });
    return review;
  }

  /** Usta kendi yorumuna yanıt verir. */
  async reply(proUserId: string, reviewId: string, body: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { proProfile: { select: { userId: true } } },
    });
    if (!review) throw new NotFoundException('Yorum bulunamadı');
    if (review.proProfile.userId !== proUserId) {
      throw new ForbiddenException('Yalnız kendi yorumuna yanıt verebilirsin');
    }
    if (review.proReply) {
      throw new BadRequestException('Bu yoruma zaten yanıt verdin');
    }
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { proReply: body.trim(), repliedAt: new Date() },
    });
  }

  /** Usta profili yorum motoru: özet + liste (anayasa RP2). */
  async byPro(proProfileId: string, verifiedOnly = false) {
    const [reviews, aggregate, verifiedCount, distribution] = await Promise.all(
      [
        this.prisma.review.findMany({
          where: {
            proProfileId,
            ...(verifiedOnly ? { isVerified: true } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: {
            customer: { select: { firstName: true, lastName: true } },
            serviceRecord: { select: { title: true } },
          },
        }),
        this.prisma.review.aggregate({
          where: { proProfileId },
          _avg: {
            rating: true,
            communication: true,
            punctuality: true,
            workmanship: true,
          },
          _count: true,
        }),
        this.prisma.review.count({
          where: { proProfileId, isVerified: true },
        }),
        this.prisma.review.groupBy({
          by: ['rating'],
          where: { proProfileId },
          _count: true,
        }),
      ],
    );

    return {
      summary: {
        average: aggregate._avg.rating
          ? Math.round(aggregate._avg.rating * 10) / 10
          : null,
        total: aggregate._count,
        verifiedCount,
        subAverages: {
          communication: aggregate._avg.communication,
          punctuality: aggregate._avg.punctuality,
          workmanship: aggregate._avg.workmanship,
        },
        distribution: [5, 4, 3, 2, 1].map((star) => ({
          star,
          count: distribution.find((d) => d.rating === star)?._count ?? 0,
        })),
      },
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        communication: review.communication,
        punctuality: review.punctuality,
        workmanship: review.workmanship,
        body: review.body,
        photoUrl: review.photoUrl,
        isVerified: review.isVerified,
        proReply: review.proReply,
        serviceTitle: review.serviceRecord.title,
        customerName:
          [review.customer.firstName, review.customer.lastName?.[0]]
            .filter(Boolean)
            .join(' ')
            .trim() || 'Müşteri',
        createdAt: review.createdAt,
      })),
    };
  }
}
