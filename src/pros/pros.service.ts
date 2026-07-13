import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DiscoverQueryDto } from './dto/discover-query.dto';
import { UpsertProProfileDto } from './dto/upsert-pro-profile.dto';

interface DiscoverRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  categoryName: string;
  categorySlug: string;
  categoryIcon: string;
  city: string;
  district: string;
  latitude: number;
  longitude: number;
  priceApproach: string;
  priceAmount: unknown;
  yearsExperience: number | null;
  distanceKm: number;
  openToday: boolean;
  ratingAvg: number | null;
  reviewCount: number;
  serviceMode: string;
  emergency: string;
  verifiedReviewCount: number;
  hasGallery: boolean;
  openNow: boolean;
  openTomorrow: boolean;
  worksWeekend: boolean;
  worksEvening: boolean;
  responseMinutes: number | null;
}

const profileInclude = {
  mainCategory: { select: { id: true, slug: true, name: true } },
  subServices: {
    include: { subService: { select: { id: true, name: true } } },
  },
  brands: { include: { brand: { select: { id: true, name: true } } } },
  regions: { select: { id: true, name: true } },
  workingHours: { orderBy: { dayOfWeek: 'asc' as const } },
  gallery: { orderBy: { sortOrder: 'asc' as const } },
} as const;

@Injectable()
export class ProsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Konuma göre yayındaki doğrulanmış ustaları döner (yakından uzağa).
   * PostGIS ST_DWithin ile; MVP ölçeğinde expression index'siz yeterli.
   */
  async discover(query: DiscoverQueryDto) {
    // ISO: 1=Pzt … 7=Paz — WorkingHour.dayOfWeek ile aynı.
    const isoDow = ((new Date().getDay() + 6) % 7) + 1;
    const radiusMeters = (query.radiusKm ?? 15) * 1000;

    const rows = await this.prisma.$queryRaw<DiscoverRow[]>(Prisma.sql`
      SELECT
        p.id,
        u."firstName", u."lastName", u."avatarUrl",
        p."coverUrl",
        c.name  AS "categoryName",
        c.slug  AS "categorySlug",
        c.icon  AS "categoryIcon",
        p.city, p.district, p.latitude, p.longitude,
        p."priceApproach"::text AS "priceApproach",
        p."priceAmount", p."yearsExperience",
        ST_Distance(
          ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography
        ) / 1000 AS "distanceKm",
        EXISTS(
          SELECT 1 FROM working_hours w
          WHERE w."proProfileId" = p.id
            AND w."dayOfWeek" = ${isoDow}
            AND w."isOpen"
        ) AS "openToday",
        (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r
          WHERE r."proProfileId" = p.id)::float AS "ratingAvg",
        (SELECT COUNT(*) FROM reviews r
          WHERE r."proProfileId" = p.id)::int AS "reviewCount",
        p."serviceMode"::text AS "serviceMode",
        p.emergency,
        (SELECT COUNT(*) FROM reviews r
          WHERE r."proProfileId" = p.id AND r."isVerified")::int
          AS "verifiedReviewCount",
        EXISTS(SELECT 1 FROM pro_gallery_images g
          WHERE g."proProfileId" = p.id) AS "hasGallery",
        EXISTS(SELECT 1 FROM working_hours w
          WHERE w."proProfileId" = p.id AND w."dayOfWeek" = ${isoDow}
            AND w."isOpen"
            AND w."opensAt" <= to_char(NOW(), 'HH24:MI')
            AND w."closesAt" >= to_char(NOW(), 'HH24:MI')) AS "openNow",
        EXISTS(SELECT 1 FROM working_hours w
          WHERE w."proProfileId" = p.id
            AND w."dayOfWeek" = ${(isoDow % 7) + 1}
            AND w."isOpen") AS "openTomorrow",
        EXISTS(SELECT 1 FROM working_hours w
          WHERE w."proProfileId" = p.id AND w."dayOfWeek" IN (6, 7)
            AND w."isOpen") AS "worksWeekend",
        EXISTS(SELECT 1 FROM working_hours w
          WHERE w."proProfileId" = p.id AND w."isOpen"
            AND w."closesAt" >= '19:00') AS "worksEvening",
        (SELECT ROUND(AVG(t.diff) / 60)::int FROM (
          SELECT EXTRACT(EPOCH FROM (m."createdAt" - LAG(m."createdAt")
                   OVER (PARTITION BY m."conversationId"
                         ORDER BY m."createdAt"))) AS diff,
                 m."senderId",
                 LAG(m."senderId") OVER (PARTITION BY m."conversationId"
                                         ORDER BY m."createdAt") AS prev
          FROM messages m
          JOIN conversations cv ON cv.id = m."conversationId"
          WHERE cv."proProfileId" = p.id
        ) t
        WHERE t."senderId" = p."userId"
          AND t.prev IS DISTINCT FROM p."userId"
          AND t.diff IS NOT NULL) AS "responseMinutes"
      FROM pro_profiles p
      JOIN users u ON u.id = p."userId"
      JOIN categories c ON c.id = p."mainCategoryId"
      WHERE p."isPublished"
        AND p."verificationStatus" = 'VERIFIED'
        AND p.latitude IS NOT NULL
        AND p.longitude IS NOT NULL
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography,
          ${radiusMeters}
        )
        AND (${query.categorySlug ?? null}::text IS NULL
             OR c.slug = ${query.categorySlug ?? null})
        AND (${query.subServiceSlug ?? null}::text IS NULL
             OR EXISTS (
               SELECT 1 FROM pro_profile_sub_services pss
               JOIN sub_services s ON s.id = pss."subServiceId"
               WHERE pss."proProfileId" = p.id
                 AND s.slug = ${query.subServiceSlug ?? null}
             ))
      ORDER BY "distanceKm" ASC
      LIMIT ${query.limit ?? 50}
    `);

    return rows.map((row) => ({
      ...row,
      priceAmount: row.priceAmount == null ? null : Number(row.priceAmount),
      distanceKm: Math.round(row.distanceKm * 10) / 10,
      displayName:
        [row.firstName, row.lastName].filter(Boolean).join(' ') || 'Usta',
    }));
  }

  /** Herkese açık profil — yalnız yayındaki doğrulanmış vitrinler. */
  async getPublicProfile(id: string) {
    const profile = await this.prisma.proProfile.findUnique({
      where: { id },
      include: {
        ...profileInclude,
        user: {
          select: { firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });
    if (
      !profile ||
      !profile.isPublished ||
      profile.verificationStatus !== 'VERIFIED'
    ) {
      throw new NotFoundException('Usta profili bulunamadı');
    }

    const isoDow = ((new Date().getDay() + 6) % 7) + 1;
    const today = profile.workingHours.find((h) => h.dayOfWeek === isoDow);

    // Profil başlığındaki 3 istatistik kutusu + categoryFit bandı verisi:
    // yorum özeti ve son mesajlaşmalardan hesaplanan ortalama yanıt süresi.
    const [reviewAgg, verifiedCount, responseMinutes] = await Promise.all([
      this.prisma.review.aggregate({
        where: { proProfileId: id },
        _avg: { rating: true },
        _count: true,
      }),
      this.prisma.review.count({
        where: { proProfileId: id, isVerified: true },
      }),
      this.averageResponseMinutes(id, profile.userId),
    ]);

    // Herkese açık yanıt: iç alanlar (iban, bankName, userId, isOnline,
    // yayın/doğrulama durumu) dışarı SIZMAZ.
    const {
      iban: _iban,
      bankName: _bankName,
      userId: _userId,
      isOnline: _isOnline,
      isPublished: _isPublished,
      verificationStatus: _verificationStatus,
      ...publicProfile
    } = profile;

    return {
      ...publicProfile,
      priceAmount:
        profile.priceAmount == null ? null : Number(profile.priceAmount),
      displayName:
        [profile.user.firstName, profile.user.lastName]
          .filter(Boolean)
          .join(' ') || 'Usta',
      openToday: today?.isOpen ?? false,
      ratingAvg: reviewAgg._avg.rating,
      reviewCount: reviewAgg._count,
      verifiedReviewCount: verifiedCount,
      responseMinutes,
    };
  }

  /** Müşteri mesajı → ustanın ilk yanıtı arası ortalama süre (dakika). */
  private async averageResponseMinutes(
    proProfileId: string,
    proUserId: string,
  ): Promise<number | null> {
    const messages = await this.prisma.message.findMany({
      where: { conversation: { proProfileId } },
      orderBy: { createdAt: 'desc' },
      take: 300,
      select: { conversationId: true, senderId: true, createdAt: true },
    });
    const byConversation = new Map<string, typeof messages>();
    for (const message of messages.reverse()) {
      const list = byConversation.get(message.conversationId) ?? [];
      list.push(message);
      byConversation.set(message.conversationId, list);
    }
    const gaps: number[] = [];
    for (const list of byConversation.values()) {
      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1];
        const curr = list[i];
        if (prev.senderId !== proUserId && curr.senderId === proUserId) {
          gaps.push(curr.createdAt.getTime() - prev.createdAt.getTime());
        }
      }
    }
    if (gaps.length === 0) return null;
    const avgMs = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    return Math.max(1, Math.round(avgMs / 60_000));
  }

  /** Usta paneli özeti (prototip pdash: selamlama + toggle + metrikler +
   *  bugün planlanan + yeni müşteri sohbetleri). */
  async myDashboard(userId: string) {
    const profile = await this.prisma.proProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        verificationStatus: true,
        isPublished: true,
        isOnline: true,
        mainCategory: { select: { name: true } },
        user: {
          select: { firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });
    if (!profile) {
      throw new NotFoundException('Usta vitrini henüz kurulmamış');
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [
      released,
      secured,
      newConversations,
      activeRecords,
      paymentPendingCount,
      ratingAgg,
      todayRecords,
      newChatRecords,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          requestedByUserId: userId,
          status: 'RELEASED',
          updatedAt: { gte: monthStart },
        },
        _sum: { netAmount: true },
      }),
      this.prisma.payment.aggregate({
        where: { requestedByUserId: userId, status: 'SECURED' },
        _sum: { netAmount: true },
      }),
      this.prisma.serviceRecord.count({
        where: {
          conversation: { proProfileId: profile.id },
          status: 'DISCUSSING',
        },
      }),
      this.prisma.serviceRecord.count({
        where: {
          conversation: { proProfileId: profile.id },
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.serviceRecord.count({
        where: {
          conversation: { proProfileId: profile.id },
          status: 'PAYMENT_PENDING',
        },
      }),
      this.prisma.review.aggregate({
        where: { proProfileId: profile.id },
        _avg: { rating: true },
        _count: true,
      }),
      this.prisma.serviceRecord.findMany({
        where: {
          conversation: { proProfileId: profile.id },
          scheduledAt: { gte: dayStart, lt: dayEnd },
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        },
        orderBy: { scheduledAt: 'asc' },
        include: {
          conversation: {
            select: {
              id: true,
              customer: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.serviceRecord.findMany({
        where: {
          conversation: { proProfileId: profile.id },
          status: 'DISCUSSING',
        },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        include: {
          conversation: {
            select: {
              id: true,
              customer: { select: { firstName: true, lastName: true } },
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { body: true, type: true, createdAt: true },
              },
            },
          },
        },
      }),
    ]);

    const customerName = (customer: {
      firstName: string | null;
      lastName: string | null;
    }) =>
      [customer.firstName, customer.lastName?.[0]]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Müşteri';

    // Okunmamış müşteri mesajı sayısı (prototip 'Yeni mesajlar' metriği).
    const unreadMessages = await this.prisma.message.count({
      where: {
        conversation: { proProfileId: profile.id },
        senderId: { not: userId },
        readAt: null,
      },
    });

    // Belge durumu (prototip doğrulama kartı: '{n} belge incelemede').
    const [docsInReview, docsMissing] = await Promise.all([
      this.prisma.proDocument.count({
        where: { proProfileId: profile.id, status: 'IN_REVIEW' },
      }),
      this.prisma.proDocument.count({
        where: { proProfileId: profile.id, status: { in: ['MISSING', 'REJECTED'] } },
      }),
    ]);

    return {
      displayName:
        [profile.user.firstName, profile.user.lastName]
          .filter(Boolean)
          .join(' ') || 'Usta',
      avatarUrl: profile.user.avatarUrl,
      categoryName: profile.mainCategory.name,
      reviewCount: ratingAgg._count,
      unreadMessages,
      docsInReview,
      docsMissing,
      isOnline: profile.isOnline,
      verificationStatus: profile.verificationStatus,
      isPublished: profile.isPublished,
      monthEarnings: Number(released._sum.netAmount ?? 0),
      securedAmount: Number(secured._sum.netAmount ?? 0),
      newConversations,
      activeJobs: activeRecords,
      paymentPendingCount,
      ratingAvg: ratingAgg._avg.rating,
      todayJobs: todayRecords.map((record) => ({
        conversationId: record.conversation.id,
        time: record.scheduledAt,
        title: record.title ?? 'Hizmet',
        customerName: customerName(record.conversation.customer),
        address: record.address,
        status: record.status,
      })),
      newChats: newChatRecords.map((record) => ({
        conversationId: record.conversation.id,
        customerName: customerName(record.conversation.customer),
        title: record.title ?? 'Yeni talep',
        lastMessage: record.conversation.messages[0]?.type === 'TEXT'
          ? record.conversation.messages[0].body
          : record.conversation.messages[0] != null
            ? 'Fotoğraf / konum'
            : '',
        at: record.conversation.messages[0]?.createdAt ?? record.updatedAt,
      })),
    };
  }

  /** Panel çevrimiçi/çevrimdışı toggle'ı (prototip). */
  async setOnline(userId: string, isOnline: boolean) {
    const profile = await this.prisma.proProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Usta vitrini henüz kurulmamış');
    }
    const updated = await this.prisma.proProfile.update({
      where: { id: profile.id },
      data: { isOnline },
      select: { isOnline: true },
    });
    return updated;
  }

  /** Aktarım hesabını kaydeder (prototip payoutReq banka satırı). */
  async setBankAccount(userId: string, bankName: string, iban: string) {
    const profile = await this.prisma.proProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Usta vitrini henüz kurulmamış');
    }
    await this.prisma.proProfile.update({
      where: { id: profile.id },
      data: { bankName, iban },
    });
    return { bankName, ibanMasked: this.maskIban(iban) };
  }

  private maskIban(iban: string) {
    return `TR•• •••• •••• ${iban.slice(-4)}`;
  }

  /** Banka hesabına aktarım talebi — aktarılabilir bakiyeyi aşamaz. */
  async createPayout(userId: string, amount: number) {
    const profile = await this.prisma.proProfile.findUnique({
      where: { userId },
      select: { id: true, bankName: true, iban: true },
    });
    if (!profile) {
      throw new NotFoundException('Usta vitrini henüz kurulmamış');
    }
    if (!profile.iban) {
      throw new BadRequestException('Önce banka hesabı eklemelisin');
    }

    const [releasedAll, payoutsAll] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { requestedByUserId: userId, status: 'RELEASED' },
        _sum: { netAmount: true },
      }),
      this.prisma.payout.aggregate({
        where: { proProfileId: profile.id },
        _sum: { amount: true },
      }),
    ]);
    const available =
      Number(releasedAll._sum.netAmount ?? 0) -
      Number(payoutsAll._sum.amount ?? 0);
    if (amount > available + 0.01) {
      throw new BadRequestException('Aktarılabilir kazancını aşamazsın');
    }

    const payout = await this.prisma.payout.create({
      data: { proProfileId: profile.id, amount },
    });
    return {
      id: payout.id,
      amount: Number(payout.amount),
      status: payout.status,
      createdAt: payout.createdAt,
    };
  }

  /** Usta hizmet akışı — 5 segment mobilde türetilir (anayasa RP5). */
  async myServiceRecords(userId: string) {
    const profile = await this.prisma.proProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Usta vitrini henüz kurulmamış');
    }

    const records = await this.prisma.serviceRecord.findMany({
      where: { conversation: { proProfileId: profile.id } },
      orderBy: { updatedAt: 'desc' },
      include: {
        review: { select: { id: true } },
        conversation: {
          select: {
            id: true,
            customer: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { body: true, type: true },
            },
          },
        },
      },
    });

    return records.map((record) => ({
      id: record.id,
      conversationId: record.conversation.id,
      customerName:
        [
          record.conversation.customer.firstName,
          record.conversation.customer.lastName,
        ]
          .filter(Boolean)
          .join(' ') || 'Müşteri',
      title: record.title,
      status: record.status,
      agreedAmount:
        record.agreedAmount == null ? null : Number(record.agreedAmount),
      hasReview: record.review != null,
      // Prototip pro hizmet kartı: son mesaj + konum · saat satırı.
      lastMessage: record.conversation.messages[0]?.type === 'TEXT'
        ? record.conversation.messages[0].body
        : record.conversation.messages[0] != null
          ? 'Fotoğraf / konum'
          : null,
      address: record.address,
      scheduledAt: record.scheduledAt,
      updatedAt: record.updatedAt,
    }));
  }

  /** Kazanç ekranı: özet + ödeme listesi (cüzdan dili YOK — anayasa). */
  async myEarnings(userId: string) {
    const profile = await this.prisma.proProfile.findUnique({
      where: { userId },
      select: { id: true, bankName: true, iban: true },
    });
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [monthReleased, payoutsAgg, payoutList] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          requestedByUserId: userId,
          status: 'RELEASED',
          updatedAt: { gte: monthStart },
        },
        _sum: { netAmount: true },
      }),
      this.prisma.payout.aggregate({
        where: { proProfileId: profile?.id ?? '' },
        _sum: { amount: true },
      }),
      this.prisma.payout.findMany({
        where: { proProfileId: profile?.id ?? '' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const [releasedAll, secured, commission, payments] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { requestedByUserId: userId, status: 'RELEASED' },
        _sum: { netAmount: true },
      }),
      this.prisma.payment.aggregate({
        where: { requestedByUserId: userId, status: 'SECURED' },
        _sum: { netAmount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          requestedByUserId: userId,
          status: { in: ['RELEASED', 'SECURED'] },
        },
        _sum: { commissionAmount: true },
      }),
      this.prisma.payment.findMany({
        where: { requestedByUserId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          serviceRecord: {
            select: {
              title: true,
              status: true,
              review: { select: { id: true } },
            },
          },
          conversation: {
            select: {
              customer: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

    const transferredTotal = Number(releasedAll._sum.netAmount ?? 0);
    const paidOut = Number(payoutsAgg._sum.amount ?? 0);

    return {
      summary: {
        transferred: transferredTotal,
        secured: Number(secured._sum.netAmount ?? 0),
        commission: Number(commission._sum.commissionAmount ?? 0),
        // Prototip payouts ekranı: aktarılabilir bakiye + bu ay toplam.
        available: Math.max(0, transferredTotal - paidOut),
        monthTotal: Number(monthReleased._sum.netAmount ?? 0),
        commissionPct: 2,
      },
      bank: profile?.iban == null
          ? null
          : {
              bankName: profile.bankName ?? 'Banka',
              ibanMasked: this.maskIban(profile.iban),
            },
      payouts: payoutList.map((payout) => ({
        id: payout.id,
        amount: Number(payout.amount),
        status: payout.status,
        createdAt: payout.createdAt,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        conversationId: p.conversationId,
        title: p.serviceRecord.title,
        status: p.status,
        serviceStatus: p.serviceRecord.status,
        hasReview: p.serviceRecord.review != null,
        customerName:
          [
            p.conversation.customer.firstName,
            p.conversation.customer.lastName?.[0],
          ]
            .filter(Boolean)
            .join(' ')
            .trim() || 'Müşteri',
        amount: Number(p.amount),
        commissionAmount: Number(p.commissionAmount),
        netAmount: Number(p.netAmount),
        createdAt: p.createdAt,
      })),
    };
  }

  async getMine(userId: string) {
    const profile = await this.prisma.proProfile.findUnique({
      where: { userId },
      include: profileInclude,
    });
    if (!profile) {
      throw new NotFoundException('Usta vitrini henüz kurulmamış');
    }
    // Ham IBAN hiçbir yanıtta cihaza inmez; yalnız maskeli hali döner
    // (kazanç/aktarım yüzeyleri de maskeli formatı kullanır).
    return {
      ...profile,
      iban: profile.iban == null ? null : this.maskIban(profile.iban),
    };
  }

  /** Taslak oluşturur/günceller. Doğrulama durumu değişmez (submit ayrı). */
  async upsertMine(userId: string, dto: UpsertProProfileDto) {
    if (dto.priceApproach !== 'NEGOTIABLE' && dto.priceAmount == null) {
      throw new BadRequestException(
        'Başlangıç/sabit fiyat için tutar girmelisin',
      );
    }

    const scalar = {
      mainCategoryId: dto.mainCategoryId,
      coverUrl: dto.coverUrl,
      bio: dto.bio,
      yearsExperience: dto.yearsExperience,
      serviceMode: dto.serviceMode,
      priceApproach: dto.priceApproach,
      priceAmount: dto.priceApproach === 'NEGOTIABLE' ? null : dto.priceAmount,
      city: dto.city,
      district: dto.district,
      latitude: dto.latitude,
      longitude: dto.longitude,
    };

    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.proProfile.upsert({
        where: { userId },
        update: scalar,
        create: { userId, ...scalar },
      });

      // İlişkiler: sil-yeniden kur (idempotent taslak semantiği).
      await tx.proProfileSubService.deleteMany({
        where: { proProfileId: profile.id },
      });
      await tx.proProfileSubService.createMany({
        data: dto.subServiceIds.map((subServiceId) => ({
          proProfileId: profile.id,
          subServiceId,
        })),
      });

      await tx.proProfileBrand.deleteMany({
        where: { proProfileId: profile.id },
      });
      await tx.proProfileBrand.createMany({
        data: dto.brandIds.map((brandId) => ({
          proProfileId: profile.id,
          brandId,
        })),
      });

      await tx.proRegion.deleteMany({ where: { proProfileId: profile.id } });
      await tx.proRegion.createMany({
        data: dto.regions.map((name) => ({
          proProfileId: profile.id,
          name,
        })),
      });

      await tx.workingHour.deleteMany({
        where: { proProfileId: profile.id },
      });
      await tx.workingHour.createMany({
        data: dto.workingHours.map((h) => ({
          proProfileId: profile.id,
          dayOfWeek: h.dayOfWeek,
          isOpen: h.isOpen,
          opensAt: h.opensAt,
          closesAt: h.closesAt,
        })),
      });

      const saved = await tx.proProfile.findUniqueOrThrow({
        where: { id: profile.id },
        include: profileInclude,
      });
      // Ham IBAN yanıtla cihaza inmez (getMine ile aynı kural).
      return {
        ...saved,
        iban: saved.iban == null ? null : this.maskIban(saved.iban),
      };
    });
  }

  async addGalleryImage(userId: string, url: string, title?: string) {
    const profile = await this.prisma.proProfile.findUnique({
      where: { userId },
      include: { _count: { select: { gallery: true } } },
    });
    if (!profile) {
      throw new NotFoundException('Önce vitrinini kurmalısın');
    }
    if (profile._count.gallery >= 20) {
      throw new BadRequestException('En fazla 20 iş örneği ekleyebilirsin');
    }
    return this.prisma.proGalleryImage.create({
      data: {
        proProfileId: profile.id,
        url,
        title,
        sortOrder: profile._count.gallery,
      },
    });
  }

  async removeGalleryImage(userId: string, imageId: string) {
    const image = await this.prisma.proGalleryImage.findUnique({
      where: { id: imageId },
      include: { proProfile: { select: { userId: true } } },
    });
    if (!image || image.proProfile.userId !== userId) {
      throw new NotFoundException('Görsel bulunamadı');
    }
    await this.prisma.proGalleryImage.delete({ where: { id: imageId } });
    return { deleted: true };
  }

  /** Vitrini doğrulamaya gönderir (missing/rejected → in_review). */
  async submitMine(userId: string) {
    const profile = await this.prisma.proProfile.findUnique({
      where: { userId },
      include: { subServices: true },
    });
    if (!profile) {
      throw new NotFoundException('Önce vitrinini kurmalısın');
    }
    if (profile.verificationStatus === 'IN_REVIEW') {
      throw new BadRequestException('Vitrinin zaten incelemede');
    }
    if (profile.verificationStatus === 'VERIFIED') {
      throw new BadRequestException('Vitrinin zaten doğrulanmış');
    }
    if (profile.subServices.length === 0 || profile.city.trim() === '') {
      throw new BadRequestException(
        'Göndermeden önce en az bir hizmet ve şehir seçmelisin',
      );
    }

    return this.prisma.proProfile.update({
      where: { id: profile.id },
      data: { verificationStatus: 'IN_REVIEW' },
      select: { id: true, verificationStatus: true },
    });
  }

  private async requireProfile(userId: string) {
    const profile = await this.prisma.proProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Usta vitrini henüz kurulmamış');
    }
    return profile;
  }

  /** Doğrulama belgeleri (prototip verification). Eksikler varsayılan listeyle döner. */
  async myDocuments(userId: string) {
    const profile = await this.requireProfile(userId);
    // Prototip verifDocs seti — her usta için sabit dört belge yuvası.
    const slots: Array<{ docType: string; title: string }> = [
      { docType: 'identity', title: 'Kimlik doğrulama' },
      { docType: 'mastery', title: 'Ustalık belgesi' },
      { docType: 'license', title: 'Doğalgaz yetki belgesi' },
      { docType: 'address-tax', title: 'Adres & vergi bilgisi' },
    ];
    const existing = await this.prisma.proDocument.findMany({
      where: { proProfileId: profile.id },
    });
    return slots.map((slot) => {
      const doc = existing.find((d) => d.docType === slot.docType);
      return {
        docType: slot.docType,
        title: slot.title,
        status: doc?.status ?? 'MISSING',
        url: doc?.url ?? null,
        updatedAt: doc?.updatedAt ?? null,
      };
    });
  }

  /** Belge yükle → incelemeye alınır; profil de incelemeye düşer. */
  async uploadDocument(userId: string, docType: string, url: string) {
    const profile = await this.requireProfile(userId);
    const valid = ['identity', 'mastery', 'license', 'address-tax'];
    if (!valid.includes(docType)) {
      throw new BadRequestException('Geçersiz belge türü');
    }
    const titles: Record<string, string> = {
      identity: 'Kimlik doğrulama',
      mastery: 'Ustalık belgesi',
      license: 'Doğalgaz yetki belgesi',
      'address-tax': 'Adres & vergi bilgisi',
    };
    const doc = await this.prisma.proDocument.upsert({
      where: {
        proProfileId_docType: { proProfileId: profile.id, docType },
      },
      update: { url, status: 'IN_REVIEW' },
      create: {
        proProfileId: profile.id,
        docType,
        title: titles[docType],
        url,
        status: 'IN_REVIEW',
      },
    });
    return {
      docType: doc.docType,
      title: doc.title,
      status: doc.status,
      url: doc.url,
      updatedAt: doc.updatedAt,
    };
  }

  /** Hizmetlerim & fiyatlar (prototip proServices). */
  async myServices(userId: string) {
    const profile = await this.requireProfile(userId);
    const services = await this.prisma.proService.findMany({
      where: { proProfileId: profile.id },
      orderBy: { sortOrder: 'asc' },
    });
    return services.map((service) => this.serializeService(service));
  }

  private serializeService(service: {
    id: string;
    title: string;
    mode: string;
    priceType: string;
    priceAmount: unknown;
    isActive: boolean;
  }) {
    return {
      id: service.id,
      title: service.title,
      mode: service.mode,
      priceType: service.priceType,
      priceAmount:
        service.priceAmount == null ? null : Number(service.priceAmount),
      isActive: service.isActive,
    };
  }

  async createService(
    userId: string,
    input: {
      title: string;
      mode?: string;
      priceType?: string;
      priceAmount?: number;
    },
  ) {
    const profile = await this.requireProfile(userId);
    const count = await this.prisma.proService.count({
      where: { proProfileId: profile.id },
    });
    const service = await this.prisma.proService.create({
      data: {
        proProfileId: profile.id,
        title: input.title,
        mode: input.mode ?? 'Yerinde',
        priceType: input.priceType ?? 'Fiyat konuşulur',
        priceAmount: input.priceAmount,
        sortOrder: count,
      },
    });
    return this.serializeService(service);
  }

  async updateService(
    userId: string,
    serviceId: string,
    input: {
      title?: string;
      mode?: string;
      priceType?: string;
      priceAmount?: number;
      isActive?: boolean;
    },
  ) {
    const profile = await this.requireProfile(userId);
    const service = await this.prisma.proService.findUnique({
      where: { id: serviceId },
    });
    if (!service || service.proProfileId !== profile.id) {
      throw new NotFoundException('Hizmet bulunamadı');
    }
    const updated = await this.prisma.proService.update({
      where: { id: serviceId },
      data: input,
    });
    return this.serializeService(updated);
  }

  async deleteService(userId: string, serviceId: string) {
    const profile = await this.requireProfile(userId);
    const service = await this.prisma.proService.findUnique({
      where: { id: serviceId },
    });
    if (!service || service.proProfileId !== profile.id) {
      throw new NotFoundException('Hizmet bulunamadı');
    }
    await this.prisma.proService.delete({ where: { id: serviceId } });
    return { deleted: true };
  }

  /** Hizmet bölgelerim (prototip proRegions): liste + ekle/sil + maks mesafe. */
  async myRegions(userId: string) {
    const profile = await this.prisma.proProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        maxDistanceKm: true,
        district: true,
        regions: { select: { id: true, name: true, approxKm: true } },
      },
    });
    if (!profile) {
      throw new NotFoundException('Usta vitrini henüz kurulmamış');
    }
    return {
      district: profile.district,
      maxDistanceKm: profile.maxDistanceKm,
      regions: profile.regions,
    };
  }

  async addRegion(userId: string, name: string, approxKm?: number) {
    const profile = await this.requireProfile(userId);
    return this.prisma.proRegion.create({
      data: { proProfileId: profile.id, name, approxKm },
      select: { id: true, name: true, approxKm: true },
    });
  }

  async removeRegion(userId: string, regionId: string) {
    const profile = await this.requireProfile(userId);
    const region = await this.prisma.proRegion.findUnique({
      where: { id: regionId },
    });
    if (!region || region.proProfileId !== profile.id) {
      throw new NotFoundException('Bölge bulunamadı');
    }
    await this.prisma.proRegion.delete({ where: { id: regionId } });
    return { deleted: true };
  }

  async setMaxDistance(userId: string, maxDistanceKm: number) {
    const profile = await this.requireProfile(userId);
    await this.prisma.proProfile.update({
      where: { id: profile.id },
      data: { maxDistanceKm },
    });
    return { maxDistanceKm };
  }

  /** Çalışma saatlerini günceller (prototip availability). */
  async setWorkingHours(
    userId: string,
    hours: Array<{
      dayOfWeek: number;
      isOpen: boolean;
      opensAt: string;
      closesAt: string;
    }>,
  ) {
    const profile = await this.requireProfile(userId);
    await this.prisma.$transaction(
      hours.map((hour) =>
        this.prisma.workingHour.upsert({
          where: {
            proProfileId_dayOfWeek: {
              proProfileId: profile.id,
              dayOfWeek: hour.dayOfWeek,
            },
          },
          update: {
            isOpen: hour.isOpen,
            opensAt: hour.opensAt,
            closesAt: hour.closesAt,
          },
          create: {
            proProfileId: profile.id,
            dayOfWeek: hour.dayOfWeek,
            isOpen: hour.isOpen,
            opensAt: hour.opensAt,
            closesAt: hour.closesAt,
          },
        }),
      ),
    );
    return { updated: hours.length };
  }

  /** Profili düzenle (prototip editProfile) — kısmi güncelleme. */
  async patchProfile(
    userId: string,
    input: { bio?: string; priceNote?: string; coverUrl?: string },
  ) {
    const profile = await this.requireProfile(userId);
    const updated = await this.prisma.proProfile.update({
      where: { id: profile.id },
      data: input,
      select: { bio: true, priceNote: true, coverUrl: true },
    });
    return updated;
  }

}
