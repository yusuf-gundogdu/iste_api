import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/**
 * TÜM veriler prototipten AYNEN alınmıştır
 * (referans/Tasarım projesinde işbirliği/İŞTE Sprint 2.dc.html —
 * CATS + CAT_INFO + catDesc + brands + PROS).
 */
interface CategorySeed {
  slug: string;
  name: string;
  icon: string;
  description: string;
  mode: string;
  subServices: string[];
  brands?: string[];
}

const FALLBACK_DESC = 'Bu kategorideki ustaları keşfet.';

const categories: CategorySeed[] = [
  {
    slug: 'elektrik',
    name: 'Elektrik',
    icon: 'bolt',
    description:
      'Avize montajı, priz arızası, sigorta sorunları ve genel elektrik işleri.',
    mode: 'Yerinde',
    subServices: ['Priz / anahtar', 'Aydınlatma', 'Pano', 'Arıza'],
    brands: ['Schneider', 'Legrand', 'Viko', 'ABB'],
  },
  {
    slug: 'su-tesisati',
    name: 'Su Tesisatı',
    icon: 'plumbing',
    description: 'Musluk, rezervuar, tıkanıklık, kaçak ve montaj işleri.',
    mode: 'Yerinde',
    subServices: ['Tıkanıklık', 'Musluk', 'Su kaçağı'],
    brands: ['ECA', 'Artema', 'Grohe'],
  },
  {
    slug: 'boya',
    name: 'Boya',
    icon: 'format_paint',
    description: 'İç cephe, dekoratif boya, alçı ve tavan işleri.',
    mode: 'Yerinde',
    subServices: ['İç cephe', 'Dekoratif', 'Tavan'],
    brands: ['Filli Boya', 'Marshall', 'Dyo'],
  },
  {
    slug: 'klima',
    name: 'Klima',
    icon: 'ac_unit',
    description: 'Klima montaj, gaz dolumu, bakım ve arıza işlemleri.',
    mode: 'Yerinde + Atölye',
    subServices: ['Montaj', 'Gaz dolumu', 'Bakım'],
    brands: ['Daikin', 'Mitsubishi', 'Arçelik', 'Vestel'],
  },
  {
    slug: 'kombi',
    name: 'Kombi',
    icon: 'hvac',
    description: 'Kombi arıza, bakım, petek temizliği ve gaz işlemleri.',
    mode: 'Yerinde',
    subServices: ['Arıza', 'Bakım', 'Petek temizliği'],
    brands: ['Vaillant', 'Bosch', 'DemirDöküm', 'Baymak'],
  },
  {
    slug: 'temizlik',
    name: 'Temizlik',
    icon: 'cleaning_services',
    description: FALLBACK_DESC,
    mode: 'Yerinde',
    subServices: ['Ev', 'Ofis', 'İnşaat sonrası'],
  },
  {
    slug: 'telefon',
    name: 'Telefon',
    icon: 'smartphone',
    description:
      'Ekran, batarya, soket, hoparlör ve cihaz teşhis işlemleri.',
    mode: 'Atölye',
    subServices: ['Ekran', 'Batarya', 'Şarj soketi'],
    brands: ['Apple', 'Samsung', 'Xiaomi'],
  },
  {
    slug: 'bilgisayar',
    name: 'Bilgisayar',
    icon: 'computer',
    description: FALLBACK_DESC,
    mode: 'Yerinde + Atölye',
    subServices: ['Format', 'Donanım', 'Virüs'],
  },
  {
    slug: 'beyaz-esya',
    name: 'Beyaz Eşya',
    icon: 'kitchen',
    description: FALLBACK_DESC,
    mode: 'Yerinde',
    subServices: ['Buzdolabı', 'Çamaşır m.', 'Bulaşık m.'],
  },
  {
    slug: 'marangoz',
    name: 'Marangoz',
    icon: 'carpenter',
    description: FALLBACK_DESC,
    mode: 'Yerinde + Atölye',
    subServices: ['Montaj', 'Tamir', 'Ölçülü mobilya'],
  },
  {
    slug: 'cilingir',
    name: 'Çilingir',
    icon: 'key',
    description: FALLBACK_DESC,
    mode: 'Yerinde',
    subServices: ['Kapı açma', 'Kilit değişimi'],
  },
  {
    slug: 'nakliye',
    name: 'Nakliye',
    icon: 'local_shipping',
    description: FALLBACK_DESC,
    mode: 'Yerinde',
    subServices: ['Evden eve', 'Ofis', 'Parça eşya'],
  },
];

/** Prototip PROS dizisi — isimler/kategoriler/mesafeler aynen. */
interface DemoPro {
  sub: string;
  firstName: string;
  lastName: string;
  categorySlug: string;
  district: string;
  lat: number;
  lng: number;
  bio: string;
  price: 'NEGOTIABLE' | 'STARTING' | 'FIXED';
  amount?: number;
}

// Konumlar Kadıköy merkezine (40.9903, 29.0264) prototipteki km
// mesafelerini verecek şekilde yerleştirildi.
const demoPros: DemoPro[] = [
  { sub: 'demo-mehmet-kaya', firstName: 'Mehmet', lastName: 'Kaya', categorySlug: 'elektrik', district: 'Kadıköy', lat: 40.9903, lng: 29.0407, bio: 'Elektrik ustası. Avize montajı, priz arızası ve pano işleri.', price: 'NEGOTIABLE' },
  { sub: 'demo-ayse-yildiz', firstName: 'Ayşe', lastName: 'Yıldız', categorySlug: 'su-tesisati', district: 'Moda', lat: 40.9714, lng: 29.0264, bio: 'Su tesisatı: tıkanıklık, musluk ve su kaçağı işleri.', price: 'NEGOTIABLE' },
  { sub: 'demo-emre-koc', firstName: 'Emre', lastName: 'Koç', categorySlug: 'klima', district: 'Osmanağa', lat: 40.9903, lng: 29.0169, bio: 'Klima montaj, gaz dolumu ve bakım. Yerinde + atölye.', price: 'STARTING', amount: 600 },
  { sub: 'demo-selin-demir', firstName: 'Selin', lastName: 'Demir', categorySlug: 'boya', district: 'Feneryolu', lat: 40.9736, lng: 29.0603, bio: 'İç cephe, dekoratif boya ve tavan işleri.', price: 'NEGOTIABLE' },
  { sub: 'demo-hakan-celik', firstName: 'Hakan', lastName: 'Çelik', categorySlug: 'telefon', district: 'Rasimpaşa', lat: 41.0016, lng: 29.0326, bio: 'Telefon tamiri: ekran, batarya, şarj soketi. Atölye.', price: 'STARTING', amount: 1200 },
  { sub: 'demo-nadir-baris', firstName: 'Nadir', lastName: 'Barış', categorySlug: 'kombi', district: 'Acıbadem', lat: 41.0093, lng: 29.0450, bio: 'Kombi arıza, bakım ve petek temizliği yapıyorum. Tüm marka kombilerde yetkili servis deneyimim var.', price: 'FIXED', amount: 150 },
  // Prototipte "Tadilat" kategorisiz usta (Yağmur Aslan, yeni/yorumsuz) —
  // CATS'te Tadilat olmadığı için en yakın kategori Marangoz'a bağlandı.
  { sub: 'demo-yagmur-aslan', firstName: 'Yağmur', lastName: 'Aslan', categorySlug: 'marangoz', district: 'Caferağa', lat: 40.9995, lng: 29.0450, bio: 'Tadilat ve montaj işleri.', price: 'NEGOTIABLE' },
  { sub: 'demo-deniz-aksoy', firstName: 'Deniz', lastName: 'Aksoy', categorySlug: 'kombi', district: 'Koşuyolu', lat: 41.0080, lng: 29.0100, bio: 'Kombi bakım ve arıza.', price: 'NEGOTIABLE' },
];

async function main() {
  // Prototip dışı eski kategoriler temizlenir (slug uyuşmazlığı).
  const validSlugs = categories.map((c) => c.slug);
  await prisma.category.deleteMany({
    where: { slug: { notIn: validSlugs } },
  });

  for (const [index, seed] of categories.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: seed.slug },
      update: {
        name: seed.name,
        icon: seed.icon,
        description: seed.description,
        mode: seed.mode,
        sortOrder: index,
        requiresBrandModel: (seed.brands?.length ?? 0) > 0,
      },
      create: {
        slug: seed.slug,
        name: seed.name,
        icon: seed.icon,
        description: seed.description,
        mode: seed.mode,
        sortOrder: index,
        requiresBrandModel: (seed.brands?.length ?? 0) > 0,
      },
    });

    for (const [subIndex, name] of seed.subServices.entries()) {
      const slug = `${seed.slug}--${subIndex}`;
      await prisma.subService.upsert({
        where: { slug },
        update: { name, sortOrder: subIndex },
        create: { slug, name, sortOrder: subIndex, categoryId: category.id },
      });
    }
    // Fazla alt hizmetler temizlenir.
    await prisma.subService.deleteMany({
      where: {
        categoryId: category.id,
        sortOrder: { gte: seed.subServices.length },
      },
    });

    for (const name of seed.brands ?? []) {
      await prisma.brand.upsert({
        where: { categoryId_name: { categoryId: category.id, name } },
        update: {},
        create: { categoryId: category.id, name },
      });
    }
    await prisma.brand.deleteMany({
      where: {
        categoryId: category.id,
        name: { notIn: seed.brands ?? [] },
      },
    });
  }

  await seedDemoPros();

  // Yönetici hesabı (Google ile giriş; dev'de DevVerifier).
  await prisma.user.upsert({
    where: {
      provider_providerSub: { provider: 'GOOGLE', providerSub: 'demo-admin' },
    },
    update: { isAdmin: true },
    create: {
      provider: 'GOOGLE',
      providerSub: 'demo-admin',
      email: 'yonetici@iste.app',
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

async function seedDemoPros() {
  for (const demo of demoPros) {
    const category = await prisma.category.findUnique({
      where: { slug: demo.categorySlug },
      include: { subServices: true, brands: true },
    });
    if (!category) continue;

    const user = await prisma.user.upsert({
      where: {
        provider_providerSub: { provider: 'GOOGLE', providerSub: demo.sub },
      },
      update: { firstName: demo.firstName, lastName: demo.lastName },
      create: {
        provider: 'GOOGLE',
        providerSub: demo.sub,
        email: `${demo.sub}@ornek.iste`,
        firstName: demo.firstName,
        lastName: demo.lastName,
      },
    });

    const profile = await prisma.proProfile.upsert({
      where: { userId: user.id },
      update: {
        mainCategoryId: category.id,
        latitude: demo.lat,
        longitude: demo.lng,
        district: demo.district,
        verificationStatus: 'VERIFIED',
        isPublished: true,
      },
      create: {
        userId: user.id,
        mainCategoryId: category.id,
        bio: demo.bio,
        serviceMode: category.mode.includes('Atölye')
          ? category.mode.includes('Yerinde')
            ? 'BOTH'
            : 'WORKSHOP'
          : 'ON_SITE',
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
      data: category.subServices.map((s) => ({
        proProfileId: profile.id,
        subServiceId: s.id,
      })),
    });

    await prisma.proProfileBrand.deleteMany({
      where: { proProfileId: profile.id },
    });
    await prisma.proProfileBrand.createMany({
      data: category.brands.map((b) => ({
        proProfileId: profile.id,
        brandId: b.id,
      })),
    });

    await prisma.workingHour.deleteMany({
      where: { proProfileId: profile.id },
    });
    await prisma.workingHour.createMany({
      data: [1, 2, 3, 4, 5, 6, 7].map((day) => ({
        proProfileId: profile.id,
        dayOfWeek: day,
        isOpen: day !== 7,
        opensAt: day === 6 ? '10:00' : '08:00',
        closesAt: day === 6 ? '16:00' : '20:00',
      })),
    });

    await prisma.proRegion.deleteMany({
      where: { proProfileId: profile.id },
    });
    await prisma.proRegion.createMany({
      data: ['Kadıköy', 'Ataşehir', 'Üsküdar'].map((name) => ({
        proProfileId: profile.id,
        name,
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
