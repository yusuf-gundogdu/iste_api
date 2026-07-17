/**
 * Marka backfill — her deploy'da (docker-entrypoint) çalışır.
 * `seed.ts` içindeki KATEGORİ tanımlarını (tek gerçek kaynak) tekrar kullanıp
 * her kategorinin marka listesini upsert eder ve `requiresBrandModel` bayrağını
 * marka varlığına göre günceller.
 *
 * Neden ayrı script: entrypoint yalnızca DB boşken (usta < 150) tam reseed eder;
 * mevcut deploylarda genişletilmiş marka listesi seed ile GELMEZ. Bu backfill
 * TAHRİPKÂR DEĞİLDİR — yeni markaları ekler, mevcut ProProfileBrand seçimlerini
 * ve diğer verileri silmez (seed'in `deleteMany` adımını yapmaz). İdempotent.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { categories } from './seed';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  let upserted = 0;
  let touchedCategories = 0;

  for (const seed of categories) {
    const category = await prisma.category.findUnique({
      where: { slug: seed.slug },
      select: { id: true, requiresBrandModel: true },
    });
    // Kategori henüz yoksa (seed hiç koşmamış) atla — reseed onu oluşturur.
    if (!category) continue;

    const brands = seed.brands ?? [];
    const shouldRequire = brands.length > 0;
    if (category.requiresBrandModel !== shouldRequire) {
      await prisma.category.update({
        where: { id: category.id },
        data: { requiresBrandModel: shouldRequire },
      });
    }

    let categoryTouched = false;
    for (const name of brands) {
      const res = await prisma.brand.upsert({
        where: { categoryId_name: { categoryId: category.id, name } },
        update: {},
        create: { categoryId: category.id, name },
      });
      // upsert her zaman kayıt döner; "yeni mi" bilgisini count ile ölçmek yerine
      // basitçe işlenen marka sayısını raporlarız.
      if (res) {
        categoryTouched = true;
        upserted++;
      }
    }
    if (categoryTouched) touchedCategories++;
  }

  console.log(
    `Marka backfill: ${touchedCategories} kategoride ${upserted} marka upsert edildi (tahripkâr değil).`,
  );
}

main()
  .catch((e) => {
    console.error('Marka backfill başarısız:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
