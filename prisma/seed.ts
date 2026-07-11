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

  await seedDemoPros();

  // Yönetici hesabı (panel girişi OTP ile — dev'de kod konsola düşer).
  await prisma.user.upsert({
    where: { phone: '+905550009999' },
    update: { isAdmin: true },
    create: {
      phone: '+905550009999',
      firstName: 'İŞTE',
      lastName: 'Yönetici',
      isAdmin: true,
    },
  });

  const counts = {
    categories: await prisma.category.count(),
    subServices: await prisma.subService.count(),
    brands: await prisma.brand.count(),
    pros: await prisma.proProfile.count(),
  };
  console.log('Seed tamam:', counts);
}

interface DemoPro {
  phone: string;
  firstName: string;
  lastName: string;
  categorySlug: string;
  district: string;
  lat: number;
  lng: number;
  years: number;
  price: 'NEGOTIABLE' | 'STARTING' | 'FIXED';
  amount?: number;
  bio: string;
}

// Kadıköy merkezli demo ustalar — geliştirme/harita testi için.
const demoPros: DemoPro[] = [
  { phone: '+905550000001', firstName: 'Mehmet', lastName: 'Yılmaz', categorySlug: 'elektrikci', district: 'Kadıköy', lat: 40.9903, lng: 29.0301, years: 12, price: 'NEGOTIABLE', bio: '12 yıldır elektrik tesisatı ve arıza işleri yapıyorum.' },
  { phone: '+905550000002', firstName: 'Ali', lastName: 'Demir', categorySlug: 'tesisatci', district: 'Moda', lat: 40.9825, lng: 29.0253, years: 8, price: 'STARTING', amount: 500, bio: 'Su kaçağı ve tesisat işlerinde uzmanım.' },
  { phone: '+905550000003', firstName: 'Hasan', lastName: 'Kaya', categorySlug: 'beyaz-esya-servisi', district: 'Fenerbahçe', lat: 40.9744, lng: 29.0459, years: 15, price: 'STARTING', amount: 750, bio: 'Tüm markalarda beyaz eşya tamiri, aynı gün servis.' },
  { phone: '+905550000004', firstName: 'Ayşe', lastName: 'Şahin', categorySlug: 'temizlik', district: 'Koşuyolu', lat: 41.0035, lng: 29.0397, years: 6, price: 'FIXED', amount: 1200, bio: 'Ekibimle ev ve ofis temizliği yapıyoruz.' },
  { phone: '+905550000005', firstName: 'Mustafa', lastName: 'Çelik', categorySlug: 'klima-servisi', district: 'Acıbadem', lat: 41.0021, lng: 29.0451, years: 10, price: 'STARTING', amount: 600, bio: 'Klima montaj, bakım ve gaz dolumu.' },
  { phone: '+905550000006', firstName: 'İbrahim', lastName: 'Arslan', categorySlug: 'boyaci', district: 'Göztepe', lat: 40.9705, lng: 29.0632, years: 20, price: 'NEGOTIABLE', bio: 'İç-dış cephe boya, alçı ve sıva işleri.' },
  { phone: '+905550000007', firstName: 'Osman', lastName: 'Koç', categorySlug: 'marangoz', district: 'Erenköy', lat: 40.9726, lng: 29.0778, years: 18, price: 'NEGOTIABLE', bio: 'Mobilya montaj/tamir ve özel dolap imalatı.' },
  { phone: '+905550000008', firstName: 'Emre', lastName: 'Aydın', categorySlug: 'kombi-servisi', district: 'Üsküdar', lat: 41.0227, lng: 29.0152, years: 9, price: 'STARTING', amount: 800, bio: 'Kombi bakım ve arıza — tüm markalar.' },
  { phone: '+905550000009', firstName: 'Fatma', lastName: 'Öztürk', categorySlug: 'temizlik', district: 'Ataşehir', lat: 40.9846, lng: 29.1064, years: 5, price: 'FIXED', amount: 1000, bio: 'Detaylı ev temizliği ve boş ev temizliği.' },
  { phone: '+905550000010', firstName: 'Kemal', lastName: 'Güneş', categorySlug: 'elektrikci', district: 'Bostancı', lat: 40.9524, lng: 29.0955, years: 7, price: 'NEGOTIABLE', bio: 'Avize montajı, priz ve pano işleri.' },
  { phone: '+905550000011', firstName: 'Serkan', lastName: 'Polat', categorySlug: 'cilingir', district: 'Kadıköy', lat: 40.9889, lng: 29.0367, years: 11, price: 'FIXED', amount: 400, bio: '7/24 kapı açma ve kilit değişimi.' },
  { phone: '+905550000012', firstName: 'Hüseyin', lastName: 'Erdoğan', categorySlug: 'nakliyat', district: 'Maltepe', lat: 40.9357, lng: 29.1310, years: 14, price: 'NEGOTIABLE', bio: 'Evden eve nakliyat ve parça eşya taşıma.' },
];

async function seedDemoPros() {
  for (const demo of demoPros) {
    const category = await prisma.category.findUnique({
      where: { slug: demo.categorySlug },
      include: { subServices: true, brands: true },
    });
    if (!category) continue;

    const user = await prisma.user.upsert({
      where: { phone: demo.phone },
      update: { firstName: demo.firstName, lastName: demo.lastName },
      create: {
        phone: demo.phone,
        firstName: demo.firstName,
        lastName: demo.lastName,
      },
    });

    const profile = await prisma.proProfile.upsert({
      where: { userId: user.id },
      update: {
        latitude: demo.lat,
        longitude: demo.lng,
        verificationStatus: 'VERIFIED',
        isPublished: true,
      },
      create: {
        userId: user.id,
        mainCategoryId: category.id,
        bio: demo.bio,
        yearsExperience: demo.years,
        serviceMode: 'ON_SITE',
        priceApproach: demo.price,
        priceAmount: demo.amount,
        city: 'İstanbul',
        district: demo.district,
        latitude: demo.lat,
        longitude: demo.lng,
        verificationStatus: 'VERIFIED',
        isPublished: true,
      },
    });

    await prisma.proProfileSubService.deleteMany({
      where: { proProfileId: profile.id },
    });
    await prisma.proProfileSubService.createMany({
      data: category.subServices
        .slice(0, 3)
        .map((s) => ({ proProfileId: profile.id, subServiceId: s.id })),
    });

    await prisma.proProfileBrand.deleteMany({
      where: { proProfileId: profile.id },
    });
    await prisma.proProfileBrand.createMany({
      data: category.brands
        .slice(0, 4)
        .map((b) => ({ proProfileId: profile.id, brandId: b.id })),
    });

    await prisma.workingHour.deleteMany({
      where: { proProfileId: profile.id },
    });
    await prisma.workingHour.createMany({
      data: [1, 2, 3, 4, 5, 6, 7].map((day) => ({
        proProfileId: profile.id,
        dayOfWeek: day,
        isOpen: day !== 7,
      })),
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
