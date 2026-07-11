import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProProfileDto } from './dto/upsert-pro-profile.dto';

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
