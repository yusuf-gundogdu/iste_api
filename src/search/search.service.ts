import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface SearchProRow {
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

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Derin arama: usta adı, kategori, alt hizmet ve marka eşleşmeleri.
   * "İlgili hizmetler" chip'leri + mesafe sıralı usta listesi döner.
   */
  async search(q: string, lat: number, lng: number) {
    const term = `%${q.trim()}%`;
    const isoDow = ((new Date().getDay() + 6) % 7) + 1;

    const [relatedCategories, relatedSubServices, pros] = await Promise.all([
      this.prisma.category.findMany({
        where: { name: { contains: q.trim(), mode: 'insensitive' } },
        select: { slug: true, name: true, icon: true },
        take: 5,
      }),
      this.prisma.subService.findMany({
        where: { name: { contains: q.trim(), mode: 'insensitive' } },
        select: {
          slug: true,
          name: true,
          category: { select: { slug: true, name: true } },
        },
        take: 8,
      }),
      this.prisma.$queryRaw<SearchProRow[]>(Prisma.sql`
        SELECT DISTINCT ON (p.id)
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
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
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
          AND (
            c.name ILIKE ${term}
            OR (COALESCE(u."firstName", '') || ' ' || COALESCE(u."lastName", '')) ILIKE ${term}
            OR EXISTS (
              SELECT 1 FROM pro_profile_sub_services pss
              JOIN sub_services s ON s.id = pss."subServiceId"
              WHERE pss."proProfileId" = p.id AND s.name ILIKE ${term}
            )
            OR EXISTS (
              SELECT 1 FROM pro_profile_brands ppb
              JOIN brands b ON b.id = ppb."brandId"
              WHERE ppb."proProfileId" = p.id AND b.name ILIKE ${term}
            )
          )
        ORDER BY p.id, "distanceKm" ASC
        LIMIT 50
      `),
    ]);

    return {
      relatedServices: [
        ...relatedCategories.map((c) => ({
          type: 'category' as const,
          slug: c.slug,
          name: c.name,
          categorySlug: c.slug,
        })),
        ...relatedSubServices.map((s) => ({
          type: 'subService' as const,
          slug: s.slug,
          name: s.name,
          categorySlug: s.category.slug,
        })),
      ],
      pros: pros
        .map((row) => ({
          ...row,
          priceAmount: row.priceAmount == null ? null : Number(row.priceAmount),
          distanceKm: Math.round(row.distanceKm * 10) / 10,
          displayName:
            [row.firstName, row.lastName].filter(Boolean).join(' ') || 'Usta',
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm),
    };
  }
}
