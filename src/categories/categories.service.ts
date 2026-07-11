import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        icon: true,
        requiresBrandModel: true,
      },
    });
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
