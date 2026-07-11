import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

interface CategorySeed {
  slug: string;
  name: string;
  icon: string;
  requiresBrandModel?: boolean;
  subServices: string[];
  brands?: string[];
}

const categories: CategorySeed[] = [
  {
    slug: 'elektrikci',
    name: 'Elektrikçi',
    icon: 'bolt',
    subServices: [
      'Priz / anahtar montajı',
      'Avize / aydınlatma montajı',
      'Sigorta kutusu / pano',
      'Elektrik arıza tespiti',
      'Kablolama / tesisat çekimi',
    ],
  },
  {
    slug: 'tesisatci',
    name: 'Tesisatçı',
    icon: 'plumbing',
    subServices: [
      'Musluk / batarya değişimi',
      'Su kaçağı tespiti ve onarımı',
      'Gider açma',
      'Klozet / rezervuar tamiri',
      'Petek / kombi tesisatı',
    ],
  },
  {
    slug: 'beyaz-esya-servisi',
    name: 'Beyaz Eşya Servisi',
    icon: 'kitchen',
    requiresBrandModel: true,
    subServices: [
      'Çamaşır makinesi tamiri',
      'Bulaşık makinesi tamiri',
      'Buzdolabı tamiri',
      'Fırın / ocak tamiri',
      'Kurutma makinesi tamiri',
    ],
    brands: [
      'Arçelik',
      'Beko',
      'Bosch',
      'Siemens',
      'Vestel',
      'Samsung',
      'LG',
      'Profilo',
      'Grundig',
    ],
  },
  {
    slug: 'klima-servisi',
    name: 'Klima Servisi',
    icon: 'ac_unit',
    requiresBrandModel: true,
    subServices: [
      'Klima montajı',
      'Klima bakımı / gaz dolumu',
      'Klima arıza tamiri',
      'Klima sökme / taşıma',
    ],
    brands: [
      'Daikin',
      'Mitsubishi',
      'Arçelik',
      'Vestel',
      'Samsung',
      'LG',
      'Baymak',
    ],
  },
  {
    slug: 'boyaci',
    name: 'Boyacı',
    icon: 'format_paint',
    subServices: [
      'İç cephe boya',
      'Dış cephe boya',
      'Alçı / sıva',
      'Duvar kağıdı uygulama',
    ],
  },
  {
    slug: 'marangoz',
    name: 'Marangoz',
    icon: 'carpenter',
    subServices: [
      'Mobilya montajı',
      'Mobilya tamiri',
      'Kapı / pencere tamiri',
      'Dolap / raf yapımı',
    ],
  },
  {
    slug: 'kombi-servisi',
    name: 'Kombi Servisi',
    icon: 'hvac',
    requiresBrandModel: true,
    subServices: ['Kombi bakımı', 'Kombi arıza tamiri', 'Kombi montajı'],
    brands: ['Vaillant', 'Baymak', 'Demirdöküm', 'Bosch', 'Buderus', 'ECA'],
  },
  {
    slug: 'temizlik',
    name: 'Temizlik',
    icon: 'cleaning_services',
    subServices: [
      'Ev temizliği',
      'Ofis temizliği',
      'İnşaat sonrası temizlik',
      'Koltuk / halı yıkama',
    ],
  },
  {
    slug: 'nakliyat',
    name: 'Nakliyat',
    icon: 'local_shipping',
    subServices: ['Evden eve nakliyat', 'Parça eşya taşıma', 'Ofis taşıma'],
  },
  {
    slug: 'cilingir',
    name: 'Çilingir',
    icon: 'key',
    subServices: ['Kapı açma', 'Kilit değişimi', 'Çelik kapı tamiri'],
  },
];

async function main() {
  for (const [index, seed] of categories.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: seed.slug },
      update: {
        name: seed.name,
        icon: seed.icon,
        sortOrder: index,
        requiresBrandModel: seed.requiresBrandModel ?? false,
      },
      create: {
        slug: seed.slug,
        name: seed.name,
        icon: seed.icon,
        sortOrder: index,
        requiresBrandModel: seed.requiresBrandModel ?? false,
      },
    });

    for (const [subIndex, name] of seed.subServices.entries()) {
      const slug = `${seed.slug}--${subIndex}`;
      await prisma.subService.upsert({
        where: { slug },
        update: { name, sortOrder: subIndex },
        create: {
          slug,
          name,
          sortOrder: subIndex,
          categoryId: category.id,
        },
      });
    }

    for (const name of seed.brands ?? []) {
      await prisma.brand.upsert({
        where: { categoryId_name: { categoryId: category.id, name } },
        update: {},
        create: { categoryId: category.id, name },
      });
    }
  }

  const counts = {
    categories: await prisma.category.count(),
    subServices: await prisma.subService.count(),
    brands: await prisma.brand.count(),
  };
  console.log('Seed tamam:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
