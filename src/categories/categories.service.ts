import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const categories = await this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        icon: true,
        description: true,
        mode: true,
        requiresBrandModel: true,
        subServices: {
          orderBy: { sortOrder: 'asc' },
          select: { name: true },
        },
        _count: {
          select: { proProfiles: { where: { isPublished: true } } },
        },
      },
    });
    // Kategoriler ekranı (prototip cats): alt hizmet adları + usta sayısı.
    return categories.map(({ subServices, _count, ...rest }) => ({
      ...rest,
      subServiceNames: subServices.map((s) => s.name),
      proCount: _count.proProfiles,
    }));
  }

  async detail(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        subServices: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, slug: true, name: true },
        },
        brands: {
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        },
      },
    });
    if (!category) {
      throw new NotFoundException('Kategori bulunamadı');
    }
    return category;
  }
}
