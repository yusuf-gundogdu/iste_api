import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  // ── İşlem Geçmişim ────────────────────────────────────────────────────
  /**
   * Müşterinin hizmet kayıtları. 6 sabit segment mobilde türetilir;
   * "yorum bekleyen" için hasReview taşınır (anayasa RP4).
   */
  async myTransactions(userId: string) {
    const records = await this.prisma.serviceRecord.findMany({
      where: { conversation: { customerId: userId } },
      orderBy: { updatedAt: 'desc' },
      include: {
        review: { select: { id: true } },
        payments: {
          select: { id: true, status: true, amount: true },
          orderBy: { createdAt: 'desc' },
        },
        conversation: {
          select: {
            id: true,
            proProfile: {
              select: {
                id: true,
                mainCategory: { select: { name: true } },
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return records.map((record) => ({
      id: record.id,
      conversationId: record.conversation.id,
      proProfileId: record.conversation.proProfile.id,
      proName:
        [
          record.conversation.proProfile.user.firstName,
          record.conversation.proProfile.user.lastName,
        ]
          .filter(Boolean)
          .join(' ') || 'Usta',
      proAvatarUrl: record.conversation.proProfile.user.avatarUrl,
      categoryName: record.conversation.proProfile.mainCategory.name,
      title: record.title,
      status: record.status,
      agreedAmount:
        record.agreedAmount == null ? null : Number(record.agreedAmount),
      hasReview: record.review != null,
      // Prisma Decimal JSON'da string'e döner; mobil num bekler (Bölüm 12).
      latestPayment: record.payments[0]
        ? {
            id: record.payments[0].id,
            status: record.payments[0].status,
            amount: Number(record.payments[0].amount),
          }
        : null,
      scheduledAt: record.scheduledAt,
      address: record.address,
      updatedAt: record.updatedAt,
    }));
  }

  // ── Favoriler ─────────────────────────────────────────────────────────
  async addFavorite(userId: string, proProfileId: string) {
    const pro = await this.prisma.proProfile.findUnique({
      where: { id: proProfileId },
      select: { isPublished: true, verificationStatus: true },
    });
    if (!pro || !pro.isPublished || pro.verificationStatus !== 'VERIFIED') {
      throw new NotFoundException('Usta bulunamadı');
    }
    await this.prisma.favorite.upsert({
      where: { userId_proProfileId: { userId, proProfileId } },
      update: {},
      create: { userId, proProfileId },
    });
    return { favorited: true };
  }

  async removeFavorite(userId: string, proProfileId: string) {
    await this.prisma.favorite.deleteMany({
      where: { userId, proProfileId },
    });
    return { favorited: false };
  }

  /** Kadıköy merkezine kuş uçuşu km (mobil varsayılan keşif merkezi). */
  private distanceKm(lat: number | null, lng: number | null): number {
    if (lat == null || lng == null) return 0;
    const centerLat = 40.9903;
    const centerLng = 29.0264;
    const rad = Math.PI / 180;
    const dLat = (lat - centerLat) * rad;
    const dLng = (lng - centerLng) * rad;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(centerLat * rad) *
        Math.cos(lat * rad) *
        Math.sin(dLng / 2) ** 2;
    return (
      Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) /
      10
    );
  }

  async listFavorites(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        proProfile: {
          include: {
            mainCategory: { select: { name: true, slug: true, icon: true } },
            user: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
            workingHours: {
              select: {
                dayOfWeek: true,
                isOpen: true,
                opensAt: true,
                closesAt: true,
              },
            },
            _count: { select: { reviews: true } },
          },
        },
      },
    });
    const isoDow = ((new Date().getDay() + 6) % 7) + 1;
    const tomorrowDow = (isoDow % 7) + 1;
    const nowHm = new Date().toTimeString().slice(0, 5); // HH:MM

    const ids = favorites.map((f) => f.proProfileId);
    const ratings = ids.length
      ? await this.prisma.review.groupBy({
          by: ['proProfileId'],
          where: { proProfileId: { in: ids } },
          _avg: { rating: true },
        })
      : [];
    // Prototip favori kartı rozetleri: "Doğrulanmış işlem" + müsaitlik hapı.
    const verifiedCounts = ids.length
      ? await this.prisma.review.groupBy({
          by: ['proProfileId'],
          where: { proProfileId: { in: ids }, isVerified: true },
          _count: true,
        })
      : [];

    return favorites.map((favorite) => {
      const pro = favorite.proProfile;
      const rating = ratings.find((r) => r.proProfileId === pro.id);
      const today = pro.workingHours.find((h) => h.dayOfWeek === isoDow);
      const tomorrow = pro.workingHours.find(
        (h) => h.dayOfWeek === tomorrowDow,
      );
      return {
        id: pro.id,
        displayName:
          [pro.user.firstName, pro.user.lastName].filter(Boolean).join(' ') ||
          'Usta',
        avatarUrl: pro.user.avatarUrl,
        coverUrl: pro.coverUrl,
        categoryName: pro.mainCategory.name,
        categorySlug: pro.mainCategory.slug,
        categoryIcon: pro.mainCategory.icon,
        city: pro.city,
        district: pro.district,
        latitude: pro.latitude ?? 0,
        longitude: pro.longitude ?? 0,
        distanceKm: this.distanceKm(pro.latitude, pro.longitude),
        openToday: today?.isOpen ?? false,
        openNow: !!(
          today?.isOpen &&
          today.opensAt <= nowHm &&
          today.closesAt >= nowHm
        ),
        openTomorrow: tomorrow?.isOpen ?? false,
        verifiedReviewCount:
          verifiedCounts.find((v) => v.proProfileId === pro.id)?._count ?? 0,
        priceApproach: pro.priceApproach,
        priceAmount: pro.priceAmount == null ? null : Number(pro.priceAmount),
        yearsExperience: pro.yearsExperience,
        ratingAvg: rating?._avg.rating
          ? Math.round(rating._avg.rating * 10) / 10
          : null,
        reviewCount: pro._count.reviews,
      };
    });
  }

  async favoriteIds(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: { proProfileId: true },
    });
    return favorites.map((f) => f.proProfileId);
  }

  // ── Adresler ──────────────────────────────────────────────────────────
  listAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createAddress(
    userId: string,
    input: { title: string; city: string; district: string; fullText: string },
  ) {
    return this.prisma.address.create({ data: { userId, ...input } });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });
    if (!address) throw new NotFoundException('Adres bulunamadı');
    if (address.userId !== userId) throw new ForbiddenException();
    await this.prisma.address.delete({ where: { id: addressId } });
    return { deleted: true };
  }

  // ── Değerlendirmelerim ────────────────────────────────────────────────
  async myReviews(userId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        proProfile: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
            mainCategory: { select: { name: true } },
          },
        },
        serviceRecord: { select: { title: true } },
      },
    });
    return reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      body: review.body,
      isVerified: review.isVerified,
      proReply: review.proReply,
      serviceTitle: review.serviceRecord.title,
      proName:
        [review.proProfile.user.firstName, review.proProfile.user.lastName]
          .filter(Boolean)
          .join(' ') || 'Usta',
      categoryName: review.proProfile.mainCategory.name,
      createdAt: review.createdAt,
    }));
  }
}
