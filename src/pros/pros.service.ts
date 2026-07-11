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
          WHERE r."proProfileId" = p.id)::int AS "reviewCount"
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

    return {
      ...profile,
      priceAmount:
        profile.priceAmount == null ? null : Number(profile.priceAmount),
      displayName:
        [profile.user.firstName, profile.user.lastName]
          .filter(Boolean)
          .join(' ') || 'Usta',
      openToday: today?.isOpen ?? false,
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
    return profile;
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

      return tx.proProfile.findUniqueOrThrow({
        where: { id: profile.id },
        include: profileInclude,
      });
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
}
