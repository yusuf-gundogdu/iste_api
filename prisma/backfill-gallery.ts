/**
 * Galeri + kapak backfill — her deploy'da (docker-entrypoint) çalışır.
 * Ustanın KATEGORİSİNE göre gerçek iş fotoğraflarını (seed-assets/gallery/{slug})
 * galeriye atar ve kapağı (coverUrl) ilk iş fotoğrafı yapar. Fotoğrafı olmayan
 * kategorilerde galeri boş kalır + coverUrl null → mobil tarafta ustanın yüzü
 * bulanık kapak olur. İdempotent: her çalıştırmada aynı sonucu yazar.
 */
import 'dotenv/config';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// seed-assets/gallery kökünü bul (cwd=/app ya da backend/).
function galleryRoot(): string | null {
  for (const base of [
    join(process.cwd(), 'seed-assets', 'gallery'),
    join(__dirname, '..', 'seed-assets', 'gallery'),
  ]) {
    if (existsSync(base)) return base;
  }
  return null;
}

// slug → [/seed-assets/gallery/{slug}/g-XX.jpg] (dosya sistemi gerçeği).
function buildPools(root: string): Map<string, string[]> {
  const pools = new Map<string, string[]>();
  for (const slug of readdirSync(root)) {
    const files = readdirSync(join(root, slug))
      .filter((f) => f.startsWith('g-'))
      .sort();
    if (files.length)
      pools.set(
        slug,
        files.map((f) => `/seed-assets/gallery/${slug}/${f}`),
      );
  }
  return pools;
}

const GALLERY_TITLES = [
  'İş örneği',
  'Tamamlanan iş',
  'Uygulama',
  'Detay çalışma',
];

async function main() {
  const root = galleryRoot();
  if (!root) {
    console.log('Galeri klasörü bulunamadı — backfill atlandı.');
    return;
  }
  const pools = buildPools(root);
  console.log(`Galeri havuzu: ${pools.size} kategori`);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    // Tüm ustalar + kategori slug'ı.
    const pros = await prisma.$queryRaw<{ id: string; slug: string }[]>`
      SELECT p.id, c.slug
      FROM pro_profiles p
      JOIN categories c ON c.id = p."mainCategoryId"`;

    let withGallery = 0;
    for (const pro of pros) {
      const urls = pools.get(pro.slug);
      // Eski galeriyi her hâlükârda temizle (idempotent + eski SVG'leri sök).
      await prisma.proGalleryImage.deleteMany({
        where: { proProfileId: pro.id },
      });
      if (!urls || urls.length === 0) {
        // Fotoğrafsız kategori: kapak da null → mobilde bulanık-yüz kapak.
        await prisma.proProfile.update({
          where: { id: pro.id },
          data: { coverUrl: null },
        });
        continue;
      }
      await prisma.proGalleryImage.createMany({
        data: urls.map((url, i) => ({
          proProfileId: pro.id,
          url,
          title: GALLERY_TITLES[i % GALLERY_TITLES.length],
          sortOrder: i,
        })),
      });
      // Kapak = ilk iş fotoğrafı (boş turuncu alan yerine gerçek iş görseli).
      await prisma.proProfile.update({
        where: { id: pro.id },
        data: { coverUrl: urls[0] },
      });
      withGallery++;
    }
    console.log(
      `Galeri backfill: ${withGallery}/${pros.length} ustaya iş fotoğrafı + kapak atandı.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Galeri backfill başarısız:', e);
  process.exit(1);
});
