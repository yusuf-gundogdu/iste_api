import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/**
 * TÜM veriler prototipten AYNEN alınmıştır
 * (referans/Tasarım projesinde işbirliği/İŞTE Sprint 2.dc.html —
 * CATS + CAT_INFO + catDesc + brands + PROS + reviewList).
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
  // ── Günümüz ustalık modelleri ──────────────────────────────────────
  {
    slug: 'pet-bakim',
    name: 'Evcil Hayvan Bakımı',
    icon: 'pets',
    description:
      'Köpek kuaförü, kedi bakımı, evde tıraş, tırnak ve pati bakımı.',
    mode: 'Yerinde + Atölye',
    subServices: [
      'Köpek tıraşı',
      'Kedi bakımı',
      'Tırnak kesimi',
      'Kulak / diş bakımı',
      'Evde bakım',
    ],
    brands: ['Andis', 'Wahl', 'Moser', 'Oster'],
  },
  {
    slug: 'oto-bakim',
    name: 'Oto Bakım & Kaplama',
    icon: 'directions_car',
    description:
      'Mobil yıkama, iç detaylı temizlik, seramik/grafen kaplama ve pasta cila.',
    mode: 'Yerinde + Atölye',
    subServices: [
      'Mobil yıkama',
      'İç detaylı temizlik',
      'Seramik kaplama',
      'Pasta cila',
      'Boya koruma (PPF)',
    ],
    brands: ['Gtechniq', 'Gyeon', 'CarPro', 'Meguiars', '3M'],
  },
  {
    slug: 'tadilat',
    name: 'Tadilat & Dekorasyon',
    icon: 'home_repair_service',
    description:
      'Banyo ve mutfak yenileme, alçıpan, fayans, laminat ve komple tadilat.',
    mode: 'Yerinde',
    subServices: [
      'Banyo yenileme',
      'Mutfak yenileme',
      'Fayans / seramik',
      'Alçıpan',
      'Laminat parke',
    ],
    brands: ['Vitra', 'Kale', 'Seranit', 'Çanakkale Seramik'],
  },
  {
    slug: 'guzellik',
    name: 'Güzellik & Bakım',
    icon: 'spa',
    description:
      'Evde manikür-pedikür, cilt bakımı, ağda, kaş tasarımı ve makyaj.',
    mode: 'Yerinde',
    subServices: [
      'Manikür / pedikür',
      'Cilt bakımı',
      'Ağda / epilasyon',
      'Kaş tasarımı',
      'Gelin / özel gün makyajı',
    ],
    brands: ['OPI', 'Kodi', 'Depend'],
  },
  {
    slug: 'kuafor',
    name: 'Kuaför & Berber',
    icon: 'content_cut',
    description: 'Evde saç kesimi, sakal tıraşı, boya ve bakım.',
    mode: 'Yerinde',
    subServices: [
      'Saç kesimi',
      'Sakal tıraşı',
      'Saç boyası',
      'Fön / bakım',
    ],
    brands: ['Wahl', 'Moser', 'Andis'],
  },
  {
    slug: 'bahce',
    name: 'Bahçe & Peyzaj',
    icon: 'grass',
    description: 'Çim biçme, budama, sulama sistemi ve peyzaj düzenleme.',
    mode: 'Yerinde',
    subServices: [
      'Çim biçme',
      'Ağaç / çalı budama',
      'Sulama sistemi',
      'Peyzaj tasarımı',
    ],
    brands: ['Husqvarna', 'Stihl', 'Bosch', 'Gardena'],
  },
  {
    slug: 'mobilya-montaj',
    name: 'Mobilya Montaj',
    icon: 'chair',
    description: 'Hazır mobilya kurulumu, gardırop, mutfak dolabı ve raf montajı.',
    mode: 'Yerinde',
    subServices: [
      'Gardırop / dolap',
      'Mutfak dolabı',
      'Raf / TV ünitesi',
      'Söküm & taşıma montajı',
    ],
    brands: ['IKEA', 'Bellona', 'İstikbal', 'Doğtaş'],
  },
  {
    slug: 'cam-balkon',
    name: 'Cam & Balkon',
    icon: 'window',
    description: 'Cam balkon, PVC pencere, sineklik ve duşakabin montajı.',
    mode: 'Yerinde',
    subServices: [
      'Cam balkon',
      'PVC pencere',
      'Sineklik',
      'Duşakabin',
    ],
    brands: ['Albert Genau', 'Winsa', 'Pimapen', 'Firest'],
  },
  {
    slug: 'ilaclama',
    name: 'İlaçlama',
    icon: 'pest_control',
    description: 'Böcek, haşere, kemirgen ilaçlama ve genel dezenfeksiyon.',
    mode: 'Yerinde',
    subServices: [
      'Böcek ilaçlama',
      'Kemirgen kontrolü',
      'Tahtakurusu',
      'Dezenfeksiyon',
    ],
  },
  {
    slug: 'hali-yikama',
    name: 'Halı Yıkama',
    icon: 'dry_cleaning',
    description: 'Halı, koltuk ve perde yıkama; yerinde koltuk temizliği.',
    mode: 'Yerinde + Atölye',
    subServices: [
      'Halı yıkama',
      'Koltuk yıkama',
      'Perde yıkama',
      'Yerinde temizlik',
    ],
  },
];

/** Prototip reviewList satırı — en yeni 2 yorum bu metinlerle döner. */
interface NamedReview {
  sub: string; // demo-yorumcu-N (kararlı kimlik → idempotent)
  firstName: string;
  lastName: string;
  rating: number; // prototip yıldızları (★★★★★ = 5, ★★★★☆ = 4)
  body: string;
  daysAgo: number; // prototip tarih etiketi ("3 gün önce" → 3)
  title: string; // hizmet kaydı başlığı (yorum ekranında görünür)
}

/** Prototip PROS dizisi — isimler/kategoriler/puanlar/mesafeler aynen. */
interface DemoPro {
  sub: string;
  firstName: string;
  lastName: string;
  categorySlug: string;
  district: string;
  lat: number;
  lng: number;
  bio: string;
  emergency: string;
  price: 'NEGOTIABLE' | 'STARTING' | 'FIXED';
  amount?: number;
  /** Prototip hours (ör. "09:00 – 20:00"). */
  opensAt: string;
  closesAt: string;
  /** Prototip avail "Yarın uygun": bugün kapalı, diğer günler açık. */
  closedToday?: boolean;
  /** Prototip rating (ROUND(AVG,1) bu değeri verir) + reviews sayısı. */
  rating: number | null;
  reviewCount: number;
  /** Prototip responseTime (dk) — mesaj çifti ile üretilir. */
  responseMinutes?: number;
  /** Prototip noGallery (Yağmur Aslan): iş örneği karosu hiç yok. */
  noGallery?: boolean;
  named: NamedReview[];
}

/**
 * Prototip galleryItems — her ustada 4 iş karosu (noGallery hariç):
 * avatars/work1..4.svg görselleri + sabit başlıklar. SVG'ler prototipten
 * AYNEN gömüldü; seed sharp ile webp'e çevirip UPLOAD_DIR'e yazar
 * (mobil taraf SVG çözemediği için webp).
 */
const GALLERY_TITLES = [
  'Montaj işi',
  'Bakım / onarım',
  'Arıza çözümü',
  'Tamamlanan iş',
];
const GALLERY_SVGS = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#F5E9D8"></rect><circle cx="150" cy="150" r="84" fill="#EFDCC4"></circle><path d="M168 66 L104 168 L146 168 L132 234 L198 128 L156 128 Z" fill="#D9532E"></path></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#E7EFE0"></rect><circle cx="150" cy="150" r="84" fill="#D9E9C5"></circle><path d="M150 74 C150 74 100 140 100 172 a50 50 0 0 0 100 0 C200 140 150 74 150 74 Z" fill="#3E7CE0"></path></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#F0E6EC"></rect><circle cx="150" cy="150" r="84" fill="#E7D5DF"></circle><rect x="96" y="104" width="84" height="30" rx="6" fill="#8E5A9E"></rect><rect x="168" y="112" width="36" height="14" rx="4" fill="#5A3A66"></rect><rect x="140" y="134" width="12" height="40" fill="#5A3A66"></rect><rect x="128" y="170" width="36" height="50" rx="6" fill="#8E5A9E"></rect></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#EDE6DA"></rect><circle cx="150" cy="150" r="84" fill="#E1D8C7"></circle><path d="M120 110 a30 30 0 1 0 34 44 L196 196 L214 178 L172 136 A30 30 0 0 0 120 110 Z" fill="#2B2B33"></path><circle cx="128" cy="122" r="9" fill="#EDE6DA"></circle></svg>',
];

/** work1..4 webp dosyalarını UPLOAD_DIR'e yazar; /uploads yollarını döner. */
async function seedGalleryImages(): Promise<string[]> {
  // Uygulama bağımlılığı (uploads.service ile aynı): SVG → webp.
  const { default: sharp } = await import('sharp');
  const { mkdir, writeFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const dir = process.env.UPLOAD_DIR ?? './uploads';
  await mkdir(dir, { recursive: true });
  const urls: string[] = [];
  for (const [i, svg] of GALLERY_SVGS.entries()) {
    const name = `demo-work-${i + 1}.webp`;
    const webp = await sharp(Buffer.from(svg), { density: 192 })
      .resize(600, 600)
      .webp({ quality: 88 })
      .toBuffer();
    await writeFile(join(dir, name), webp);
    urls.push(`/uploads/${name}`);
  }
  return urls;
}

// Konumlar Kadıköy merkezine (40.9903, 29.0264) prototipteki km
// mesafelerini verecek şekilde yerleştirildi (PostGIS geography ile
// doğrulandı: 1.2 / 2.1 / 0.8 / 3.4 / 1.6 / 2.8 / 1.9 / 2.4 km).
const demoPros: DemoPro[] = [
  {
    sub: 'demo-mehmet-kaya',
    firstName: 'Mehmet',
    lastName: 'Kaya',
    categorySlug: 'elektrik',
    district: 'Kadıköy',
    lat: 40.9903,
    lng: 29.0407, // 1.2 km
    bio: '12 yıldır elektrik işleri yapıyorum. Kadıköy ve çevre ilçelere gidiyorum; pano, priz ve aydınlatma arızalarında hızlı çözüm sunarım.',
    emergency: 'Var',
    price: 'NEGOTIABLE',
    opensAt: '09:00',
    closesAt: '20:00',
    rating: 4.9,
    reviewCount: 128,
    responseMinutes: 15,
    named: [
      { sub: 'demo-yorumcu-1', firstName: 'Ali', lastName: 'B.', rating: 5, daysAgo: 3, title: 'Priz arızası', body: 'Çok hızlı geldi, sorunu 20 dakikada çözdü. Temiz çalışıyor.' },
      { sub: 'demo-yorumcu-2', firstName: 'Sema', lastName: 'Ç.', rating: 5, daysAgo: 7, title: 'Avize montajı', body: 'Güler yüzlü ve işini biliyor. Fiyatı da gayet uygundu.' },
    ],
  },
  {
    sub: 'demo-ayse-yildiz',
    firstName: 'Hasan',
    lastName: 'Yıldız',
    categorySlug: 'su-tesisati',
    district: 'Moda',
    lat: 40.9714,
    lng: 29.0264, // 2.1 km
    bio: 'Tesisat tamiri ve tıkanıklık açma konusunda uzmanım. Kadıköy bölgesinde 8 yıldır hizmet veriyorum.',
    emergency: 'Var',
    price: 'NEGOTIABLE',
    opensAt: '08:30',
    closesAt: '19:00',
    rating: 4.8,
    reviewCount: 96,
    responseMinutes: 20,
    named: [
      { sub: 'demo-yorumcu-3', firstName: 'Murat', lastName: 'K.', rating: 5, daysAgo: 2, title: 'Tıkanıklık açma', body: 'Acil aradım, yarım saatte geldi. Çok teşekkürler.' },
      { sub: 'demo-yorumcu-4', firstName: 'Elif', lastName: 'Y.', rating: 4, daysAgo: 5, title: 'Musluk tamiri', body: 'İşini iyi yaptı, biraz geç geldi ama sonuç güzel.' },
    ],
  },
  {
    sub: 'demo-emre-koc',
    firstName: 'Emre',
    lastName: 'Koç',
    categorySlug: 'klima',
    district: 'Osmanağa',
    lat: 40.9903,
    lng: 29.0169, // 0.8 km
    bio: 'Klima montaj, bakım ve gaz dolumu yapıyorum. Tüm marka split ve VRV sistemlerde deneyimliyim.',
    emergency: 'Yok',
    price: 'STARTING',
    amount: 600,
    opensAt: '10:00',
    closesAt: '18:00',
    closedToday: true, // prototip "Yarın uygun"
    rating: 4.7,
    reviewCount: 74,
    responseMinutes: 30,
    named: [
      { sub: 'demo-yorumcu-5', firstName: 'Can', lastName: 'T.', rating: 5, daysAgo: 4, title: 'Klima montaj', body: 'Montajı çok düzgün yaptı, kablo işçiliği temizdi.' },
      { sub: 'demo-yorumcu-6', firstName: 'Nur', lastName: 'B.', rating: 4, daysAgo: 14, title: 'Klima bakım', body: 'Bakım için geldi, memnun kaldım.' },
    ],
  },
  {
    sub: 'demo-selin-demir',
    firstName: 'Serkan',
    lastName: 'Demir',
    categorySlug: 'boya',
    district: 'Feneryolu',
    lat: 40.9736,
    lng: 29.0603, // 3.4 km
    bio: 'İç mekan boya ve dekoratif uygulama yapıyorum. Toz kontrollü, temiz çalışmayı önemserim.',
    emergency: 'Yok',
    price: 'NEGOTIABLE',
    opensAt: '09:00',
    closesAt: '18:00',
    rating: 5.0,
    reviewCount: 41,
    responseMinutes: 25,
    named: [
      { sub: 'demo-yorumcu-7', firstName: 'Gamze', lastName: 'A.', rating: 5, daysAgo: 7, title: 'Salon boya', body: 'Salonu boyadı, hiç kir bırakmadı. Sonuç harika oldu.' },
      { sub: 'demo-yorumcu-8', firstName: 'İlker', lastName: 'K.', rating: 5, daysAgo: 21, title: 'İç cephe boya', body: 'Titiz ve hızlı. Kesinlikle tavsiye ederim.' },
    ],
  },
  {
    sub: 'demo-hakan-celik',
    firstName: 'Hakan',
    lastName: 'Çelik',
    categorySlug: 'telefon',
    district: 'Rasimpaşa',
    lat: 41.0036,
    lng: 29.0337, // 1.6 km
    bio: 'Telefon ekran, batarya ve şarj soketi değişimi yapıyorum. Çoğu tamir aynı gün teslim.',
    emergency: 'Yok',
    price: 'STARTING',
    amount: 1200,
    // Prototip "Şu an uygun" (10:00–21:00 yerel): backend openNow saat
    // dizgilerini DB NOW() (UTC) ile karşılaştırır; yerel 10:00 = 07:00 UTC.
    opensAt: '07:00',
    closesAt: '21:00', // atölye her gün açık; >=19:00 → akşam filtresi
    rating: 4.6,
    reviewCount: 210,
    responseMinutes: 10,
    named: [
      { sub: 'demo-yorumcu-9', firstName: 'Onur', lastName: 'N.', rating: 5, daysAgo: 2, title: 'Ekran değişimi', body: 'Ekranı 40 dakikada değişti, orijinal kalite. Süper.' },
      { sub: 'demo-yorumcu-10', firstName: 'Berk', lastName: 'B.', rating: 4, daysAgo: 6, title: 'Batarya değişimi', body: 'Fiyat performans iyi, işini biliyor.' },
    ],
  },
  {
    sub: 'demo-nadir-baris',
    firstName: 'Nadir',
    lastName: 'Barış',
    categorySlug: 'kombi',
    district: 'Acıbadem',
    lat: 41.0106,
    lng: 29.0462, // 2.8 km
    bio: 'Kombi arıza, bakım ve petek temizliği yapıyorum. Tüm marka kombilerde yetkili servis deneyimim var.',
    emergency: 'Var',
    price: 'FIXED',
    amount: 150,
    opensAt: '08:00',
    closesAt: '20:00',
    rating: 4.9,
    reviewCount: 53,
    responseMinutes: 18,
    named: [
      { sub: 'demo-yorumcu-11', firstName: 'Rana', lastName: 'T.', rating: 5, daysAgo: 1, title: 'Kombi arıza', body: 'Kombiyi çalışır hale getirdi, çok ilgiliydi.' },
      { sub: 'demo-yorumcu-12', firstName: 'Faruk', lastName: 'Y.', rating: 5, daysAgo: 7, title: 'Petek temizliği', body: 'Petek temizliği sonrası ev çok daha iyi ısınıyor.' },
    ],
  },
  // Prototipte "Tadilat" kategorisiz usta (Yağmur Aslan, yeni/yorumsuz) —
  // CATS'te Tadilat olmadığı için en yakın kategori Marangoz'a bağlandı.
  {
    sub: 'demo-yagmur-aslan',
    firstName: 'Yavuz',
    lastName: 'Aslan',
    categorySlug: 'marangoz',
    district: 'Caferağa',
    lat: 40.9995,
    lng: 29.0450, // 1.9 km
    bio: 'Tadilat ve montaj işleri.',
    emergency: 'Yok',
    price: 'NEGOTIABLE',
    opensAt: '09:00',
    closesAt: '18:00',
    rating: null, // prototip "Yeni" — hiç yorum yok
    reviewCount: 0,
    noGallery: true, // prototip: yeni ustanın iş örneği yok
    named: [],
  },
  {
    sub: 'demo-deniz-aksoy',
    firstName: 'Deniz',
    lastName: 'Aksoy',
    categorySlug: 'kombi',
    district: 'Koşuyolu',
    lat: 41.008,
    lng: 29.01, // 2.4 km
    bio: 'Kombi bakım ve arıza servisi.',
    emergency: 'Hafta içi',
    price: 'NEGOTIABLE',
    opensAt: '09:00',
    closesAt: '19:00',
    rating: 4.7,
    reviewCount: 12,
    responseMinutes: 22,
    named: [
      { sub: 'demo-yorumcu-13', firstName: 'Mert', lastName: 'T.', rating: 5, daysAgo: 4, title: 'Kombi bakım', body: 'Hızlı ve temiz çalıştı.' },
    ],
  },
];

// Toplu (metinsiz) yorumların müşterileri: demo-musteri-1..N.
// Aynı müşteri + aynı usta çifti tek sohbet olabildiğinden (unique)
// en kalabalık ustanın yorum sayısı kadar müşteri gerekir.
const DEMO_CUSTOMER_COUNT = Math.max(
  ...demoPros.map((p) => p.reviewCount - p.named.length),
);
const CUSTOMER_FIRST = [
  'Ahmet', 'Zeynep', 'Mustafa', 'Elif', 'Hüseyin', 'Merve', 'İbrahim',
  'Fatma', 'Kemal', 'Aslı', 'Serkan', 'Derya', 'Tolga', 'Pınar', 'Burak',
  'Gül', 'Volkan', 'Esra', 'Cem', 'Hale',
];
const CUSTOMER_LAST = [
  'Yılmaz', 'Kara', 'Şahin', 'Aydın', 'Öztürk', 'Arslan', 'Doğan',
  'Kılıç', 'Çetin', 'Koçak', 'Erdem', 'Güneş', 'Polat',
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

  // Demo giriş hesabı (login ekranındaki "Demo ile giriş" butonu).
  await prisma.user.upsert({
    where: {
      provider_providerSub: {
        provider: 'GOOGLE',
        providerSub: 'demo-kullanici',
      },
    },
    update: {},
    create: {
      provider: 'GOOGLE',
      providerSub: 'demo-kullanici',
      email: 'demo@iste.app',
      firstName: 'Demo',
      lastName: 'Kullanıcı',
    },
  });

  const counts = {
    categories: await prisma.category.count(),
    subServices: await prisma.subService.count(),
    brands: await prisma.brand.count(),
    pros: await prisma.proProfile.count(),
    reviews: await prisma.review.count(),
  };
  console.log('Seed tamam:', counts);
}

async function seedDemoPros() {
  // Prototip iş örneği görselleri (work1..4) diske yazılır.
  const galleryUrls = await seedGalleryImages();

  // Yorum müşterileri tek seferde hazırlanır (idempotent: skipDuplicates).
  await prisma.user.createMany({
    data: Array.from({ length: DEMO_CUSTOMER_COUNT }, (_, i) => ({
      provider: 'GOOGLE' as const,
      providerSub: `demo-musteri-${i + 1}`,
      email: `demo-musteri-${i + 1}@ornek.iste`,
      firstName: CUSTOMER_FIRST[i % CUSTOMER_FIRST.length],
      lastName: CUSTOMER_LAST[i % CUSTOMER_LAST.length],
    })),
    skipDuplicates: true,
  });
  const bulkCustomers = (
    await prisma.user.findMany({
      where: { providerSub: { startsWith: 'demo-musteri-' } },
      select: { id: true, providerSub: true },
    })
  ).sort(
    (a, b) =>
      Number(a.providerSub.replace('demo-musteri-', '')) -
      Number(b.providerSub.replace('demo-musteri-', '')),
  );

  // Prototip reviewList yazarları (kararlı sub → idempotent).
  await prisma.user.createMany({
    data: demoPros.flatMap((p) =>
      p.named.map((n) => ({
        provider: 'GOOGLE' as const,
        providerSub: n.sub,
        email: `${n.sub}@ornek.iste`,
        firstName: n.firstName,
        lastName: n.lastName,
      })),
    ),
    skipDuplicates: true,
  });

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

    const serviceMode = category.mode.includes('Atölye')
      ? category.mode.includes('Yerinde')
        ? ('BOTH' as const)
        : ('WORKSHOP' as const)
      : ('ON_SITE' as const);

    const profile = await prisma.proProfile.upsert({
      where: { userId: user.id },
      update: {
        mainCategoryId: category.id,
        bio: demo.bio,
        serviceMode,
        priceApproach: demo.price,
        priceAmount: demo.amount ?? null,
        latitude: demo.lat,
        longitude: demo.lng,
        district: demo.district,
        emergency: demo.emergency,
        maxDistanceKm: 8,
        verificationStatus: 'VERIFIED',
        isPublished: true,
      },
      create: {
        userId: user.id,
        mainCategoryId: category.id,
        bio: demo.bio,
        serviceMode,
        priceApproach: demo.price,
        priceAmount: demo.amount,
        city: 'İstanbul',
        district: demo.district,
        emergency: demo.emergency,
        latitude: demo.lat,
        longitude: demo.lng,
        maxDistanceKm: 8,
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

    // Çalışma saatleri prototip hours + avail'e göre:
    // "Bugün uygun" → her gün açık; "Yarın uygun" (Emre) → bugün kapalı;
    // "Şu an uygun" (Hakan) → her gün 10:00–21:00 (openNow saat aralığından).
    const todayIso = ((new Date().getDay() + 6) % 7) + 1; // 1=Pzt … 7=Paz
    await prisma.workingHour.deleteMany({
      where: { proProfileId: profile.id },
    });
    await prisma.workingHour.createMany({
      data: [1, 2, 3, 4, 5, 6, 7].map((day) => ({
        proProfileId: profile.id,
        dayOfWeek: day,
        isOpen: demo.closedToday ? day !== todayIso : true,
        opensAt: demo.opensAt,
        closesAt: demo.closesAt,
      })),
    });

    await prisma.proRegion.deleteMany({
      where: { proProfileId: profile.id },
    });
    // Prototip 38: Kadıköy merkez, Ataşehir ~5 km, Üsküdar ~7 km.
    await prisma.proRegion.createMany({
      data: [
        { name: 'Kadıköy', approxKm: null },
        { name: 'Ataşehir', approxKm: 5 },
        { name: 'Üsküdar', approxKm: 7 },
      ].map((r) => ({
        proProfileId: profile.id,
        name: r.name,
        approxKm: r.approxKm,
      })),
    });

    // Prototip galleryItems: noGallery (Yağmur) hariç 4'er iş karosu.
    await prisma.proGalleryImage.deleteMany({
      where: { proProfileId: profile.id },
    });
    if (!demo.noGallery) {
      await prisma.proGalleryImage.createMany({
        data: galleryUrls.map((url, i) => ({
          proProfileId: profile.id,
          url,
          title: GALLERY_TITLES[i],
          sortOrder: i,
        })),
      });
    }

    await seedDemoReviews(demo, profile.id, user.id, bulkCustomers, category);
  }
}

/**
 * Prototip rating/reviews değerlerini üreten yorum kayıtları.
 * Şema zinciri: Conversation (unique müşteri+usta) → ServiceRecord
 * (COMPLETED) → Review. Prototip reviewList metinleri en YENİ 2 yorumdur;
 * kalanı 5/4 yıldız karışımıyla ortalamayı prototip değerine getirir
 * (ROUND(AVG,1) doğrulandı: 4.9 / 4.8 / 4.7 / 5.0 / 4.6 / 4.9 / 4.7).
 */
async function seedDemoReviews(
  demo: DemoPro,
  proProfileId: string,
  proUserId: string,
  bulkCustomers: Array<{ id: string }>,
  category: { name: string; subServices: Array<{ name: string }> },
) {
  // İdempotens: bu ustanın demo yorum sohbetleri silinir (cascade ile
  // hizmet kaydı + yorum + mesajlar da gider). Gerçek kullanıcı sohbetleri
  // (ör. demo-kullanici) korunur.
  await prisma.conversation.deleteMany({
    where: {
      proProfileId,
      customer: {
        OR: [
          { providerSub: { startsWith: 'demo-musteri-' } },
          { providerSub: { startsWith: 'demo-yorumcu-' } },
        ],
      },
    },
  });
  if (demo.reviewCount === 0 || demo.rating == null) return;

  const now = Date.now();
  const DAY = 86_400_000;
  const namedUsers = await prisma.user.findMany({
    where: { providerSub: { in: demo.named.map((n) => n.sub) } },
    select: { id: true, providerSub: true },
  });

  // Yıldız dağılımı: fivesTotal beşli, kalanı dörtlü → ortalama prototipteki
  // değere yuvarlanır. Prototip metinli yorumların yıldızları düşülür.
  const fivesTotal = Math.round((demo.rating - 4) * demo.reviewCount);
  const namedFives = demo.named.filter((n) => n.rating === 5).length;
  const bulkCount = demo.reviewCount - demo.named.length;
  const bulkFives = fivesTotal - namedFives;
  const bulkFours = bulkCount - bulkFives;

  const conversations: Array<{
    id: string;
    customerId: string;
    proProfileId: string;
    createdAt: Date;
    lastMessageAt: Date;
  }> = [];
  const records: Array<{
    id: string;
    conversationId: string;
    status: 'COMPLETED';
    title: string;
    createdAt: Date;
  }> = [];
  const reviews: Array<{
    serviceRecordId: string;
    proProfileId: string;
    customerId: string;
    rating: number;
    communication?: number;
    punctuality?: number;
    workmanship?: number;
    body: string;
    isVerified: boolean;
    createdAt: Date;
  }> = [];

  const pushReview = (
    customerId: string,
    rating: number,
    body: string,
    title: string,
    createdAt: Date,
    isVerified: boolean,
    withSubRatings: boolean,
  ) => {
    const conversationId = randomUUID();
    const recordId = randomUUID();
    conversations.push({
      id: conversationId,
      customerId,
      proProfileId,
      createdAt: new Date(createdAt.getTime() - 2 * DAY),
      lastMessageAt: createdAt,
    });
    records.push({
      id: recordId,
      conversationId,
      status: 'COMPLETED',
      title,
      createdAt: new Date(createdAt.getTime() - 2 * DAY),
    });
    reviews.push({
      serviceRecordId: recordId,
      proProfileId,
      customerId,
      rating,
      ...(withSubRatings
        ? { communication: rating, punctuality: rating, workmanship: rating }
        : {}),
      body,
      isVerified,
      createdAt,
    });
    return conversationId;
  };

  // 1) Prototip reviewList metinleri — en yeni yorumlar.
  const namedConversationIds: string[] = [];
  for (const named of demo.named) {
    const customer = namedUsers.find((u) => u.providerSub === named.sub);
    if (!customer) continue;
    namedConversationIds.push(
      pushReview(
        customer.id,
        named.rating,
        named.body,
        named.title,
        new Date(now - named.daysAgo * DAY),
        true, // prototipte doğrulanmış işlem rozeti görünür
        true,
      ),
    );
  }

  // 2) Toplu yorumlar — metinsiz, prototip metinlilerden daha ESKİ.
  const oldestNamedDays = Math.max(0, ...demo.named.map((n) => n.daysAgo));
  const subServiceNames = category.subServices.map((s) => s.name);
  for (let i = 0; i < bulkCount; i++) {
    // 4 yıldızlılar eşit aralıklarla serpiştirilir (Bresenham).
    const isFour =
      Math.floor(((i + 1) * bulkFours) / bulkCount) >
      Math.floor((i * bulkFours) / bulkCount);
    const daysAgo = oldestNamedDays + 3 + Math.round(i * 2.5);
    pushReview(
      bulkCustomers[i].id,
      isFour ? 4 : 5,
      '',
      subServiceNames[i % subServiceNames.length] ?? category.name,
      new Date(now - daysAgo * DAY - (i % 12) * 3_600_000),
      i % 2 === 0,
      false,
    );
  }

  await prisma.conversation.createMany({ data: conversations });
  await prisma.serviceRecord.createMany({ data: records });
  await prisma.review.createMany({ data: reviews });

  // 3) Prototip responseTime — müşteri mesajı + usta yanıtı çifti.
  if (demo.responseMinutes != null && namedConversationIds.length > 0) {
    const conversationId = namedConversationIds[0];
    const customerId = conversations[0].customerId;
    const askedAt = new Date(now - DAY);
    await prisma.message.createMany({
      data: [
        {
          conversationId,
          senderId: customerId,
          body: 'Merhaba, bugün müsait misiniz?',
          createdAt: askedAt,
        },
        {
          conversationId,
          senderId: proUserId,
          body: 'Merhaba, uygunum. Detayları konuşalım.',
          createdAt: new Date(
            askedAt.getTime() + demo.responseMinutes * 60_000,
          ),
        },
      ],
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
