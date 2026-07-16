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

/**
 * Uygulama içi ödeme geçmişi (kazanç ekranı + "Doğrulanmış işlem" verisi).
 * Her kayıt kendi Conversation → ServiceRecord(COMPLETED) → Payment zincirini
 * kurar; ayrı bir ödeme müşterisi (demo-odeme-*) ile eşleşir.
 */
interface PaymentSeed {
  amount: number;
  status: 'SECURED' | 'RELEASED';
  title: string;
  daysAgo: number;
  customerFirst: string;
  customerLast: string;
  note?: string;
}

/** Atakum ustaları — gerçekçi Samsun demo verisi. */
interface DemoPro {
  sub: string;
  firstName: string;
  lastName: string;
  categorySlug: string;
  district: string;
  /** Şehir (Atakum → Samsun varsayılan; Beykoz → İstanbul). */
  city?: string;
  lat: number;
  lng: number;
  bio: string;
  emergency: string;
  price: 'NEGOTIABLE' | 'STARTING' | 'FIXED';
  amount?: number;
  /** Deneyim yılı (profil başlığı). */
  yearsExperience?: number;
  /** Alt hizmet seçimi (kategori alt hizmet adları). Yoksa hepsi atanır. */
  subServices?: string[];
  /** Marka uzmanlığı (kategori marka adları). Yoksa hepsi atanır. */
  brands?: string[];
  /** Hizmet bölgeleri. Yoksa Atakum varsayılanı kullanılır. */
  regions?: Array<{ name: string; approxKm: number | null }>;
  /** Uygulama içi ödeme geçmişi (kazanç + doğrulanmış işlem verisi). */
  payments?: PaymentSeed[];
  /** Çalışma saatleri (ör. "09:00 – 20:00"). */
  opensAt: string;
  closesAt: string;
  /** "Yarın uygun": bugün kapalı, diğer günler açık. */
  closedToday?: boolean;
  /** rating (ROUND(AVG,1) bu değeri verir) + reviews sayısı. */
  rating: number | null;
  reviewCount: number;
  /** responseTime (dk) — mesaj çifti ile üretilir. */
  responseMinutes?: number;
  /** noGallery (yeni/yorumsuz ustalar): iş örneği karosu hiç yok. */
  noGallery?: boolean;
  /** Doğrulama durumu (varsayılan VERIFIED — yayında). Yeni ustalar IN_REVIEW. */
  verificationStatus?: 'VERIFIED' | 'IN_REVIEW' | 'MISSING';
  /** Yayın durumu (varsayılan true). Yeni/doğrulanmamış ustalar false. */
  isPublished?: boolean;
  named: NamedReview[];
}

// Atakum merkez (41.3200, 36.3300). 1 km ≈ 0.0090° enlem, 0.0120° boylam @41°.
// Ustalar merkeze göre verilen mesafe (km) + yön (derece) ile konumlanır;
// PostGIS geography discover sorgusu gerçek mesafeyi bu noktalardan hesaplar.
const ATAKUM_CENTER = { lat: 41.32, lng: 36.33 };
const KM_PER_DEG_LAT = 0.009;
const KM_PER_DEG_LNG = 0.012;
function atakumCoord(km: number, bearingDeg: number) {
  const rad = (bearingDeg * Math.PI) / 180;
  return {
    lat: ATAKUM_CENTER.lat + km * Math.cos(rad) * KM_PER_DEG_LAT,
    lng: ATAKUM_CENTER.lng + km * Math.sin(rad) * KM_PER_DEG_LNG,
  };
}

const DEFAULT_REGIONS: Array<{ name: string; approxKm: number | null }> = [
  { name: 'Atakum', approxKm: null },
  { name: 'İlkadım', approxKm: 7 },
];

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

// Konumlar Samsun Atakum merkezine (41.3200, 36.3300) göre mesafe (km) +
// yön (derece) ile yerleştirilir; atakumCoord() gerçek koordinatı üretir.
// PostGIS geography discover sorgusu mesafeyi bu noktalardan hesaplar.
const demoPros: DemoPro[] = [
  // ── 1) Elektrik — genel usta, köklü (Denizevleri, ~1.2 km) ──────────────
  {
    sub: 'demo-mehmet-kaya',
    firstName: 'Mehmet',
    lastName: 'Kaya',
    categorySlug: 'elektrik',
    district: 'Denizevleri',
    ...atakumCoord(1.2, 40),
    bio: '12 yıldır Atakum ve Samsun genelinde elektrik işleri yapıyorum. Pano, priz ve aydınlatma arızalarında hızlı ve temiz çözüm sunarım. Denizevleri ve sahil hattına aynı gün gelebiliyorum.',
    emergency: 'Var',
    price: 'NEGOTIABLE',
    yearsExperience: 12,
    opensAt: '09:00',
    closesAt: '20:00',
    rating: 4.9,
    reviewCount: 128,
    responseMinutes: 15,
    regions: [
      { name: 'Atakum', approxKm: null },
      { name: 'İlkadım', approxKm: 6 },
      { name: 'Canik', approxKm: 12 },
    ],
    named: [
      { sub: 'demo-yorumcu-1', firstName: 'Ali', lastName: 'B.', rating: 5, daysAgo: 3, title: 'Priz arızası', body: 'Çok hızlı geldi, sorunu 20 dakikada çözdü. Temiz çalışıyor.' },
      { sub: 'demo-yorumcu-2', firstName: 'Sema', lastName: 'Ç.', rating: 5, daysAgo: 7, title: 'Avize montajı', body: 'Güler yüzlü ve işini biliyor. Fiyatı da gayet uygundu.' },
    ],
  },
  // ── 2) Su tesisatı — genel usta, acil (Mimarsinan, ~2.1 km) ─────────────
  {
    sub: 'demo-ayse-yildiz',
    firstName: 'Hasan',
    lastName: 'Yıldız',
    categorySlug: 'su-tesisati',
    district: 'Mimarsinan',
    ...atakumCoord(2.1, 200),
    bio: 'Tesisat tamiri ve tıkanıklık açmada uzmanım. Mimarsinan ve Atakum bölgesinde 8 yıldır hizmet veriyorum; su kaçağını kırmadan tespit ediyorum.',
    emergency: 'Var',
    price: 'NEGOTIABLE',
    yearsExperience: 8,
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
  // ── 3) Klima — genel, bugün kapalı/yarın uygun (Körfez, ~0.9 km) ────────
  {
    sub: 'demo-emre-koc',
    firstName: 'Emre',
    lastName: 'Koç',
    categorySlug: 'klima',
    district: 'Körfez',
    ...atakumCoord(0.9, 300),
    bio: 'Klima montaj, bakım ve gaz dolumu yapıyorum. Tüm marka split ve VRF sistemlerde deneyimliyim. Körfez ve Atakent çevresine montaj için randevu veriyorum.',
    emergency: 'Yok',
    price: 'STARTING',
    amount: 600,
    yearsExperience: 9,
    opensAt: '10:00',
    closesAt: '18:00',
    closedToday: true, // "Yarın uygun"
    rating: 4.7,
    reviewCount: 74,
    responseMinutes: 30,
    named: [
      { sub: 'demo-yorumcu-5', firstName: 'Can', lastName: 'T.', rating: 5, daysAgo: 4, title: 'Klima montaj', body: 'Montajı çok düzgün yaptı, kablo işçiliği temizdi.' },
      { sub: 'demo-yorumcu-6', firstName: 'Nur', lastName: 'B.', rating: 4, daysAgo: 14, title: 'Klima bakım', body: 'Bakım için geldi, memnun kaldım.' },
    ],
  },
  // ── 4) Boya — titiz usta, 5.0 (Balaç, ~3.4 km) ──────────────────────────
  {
    sub: 'demo-selin-demir',
    firstName: 'Serkan',
    lastName: 'Demir',
    categorySlug: 'boya',
    district: 'Balaç',
    ...atakumCoord(3.4, 150),
    bio: 'İç mekan boya ve dekoratif uygulama yapıyorum. Toz kontrollü, temiz çalışmayı önemserim. Balaç ve çevresinde daire ve villa boyası yapıyorum.',
    emergency: 'Yok',
    price: 'NEGOTIABLE',
    yearsExperience: 14,
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
  // ── 5) Telefon — atölye, çok yorumlu (Atakent, ~1.6 km) ─────────────────
  {
    sub: 'demo-hakan-celik',
    firstName: 'Hakan',
    lastName: 'Çelik',
    categorySlug: 'telefon',
    district: 'Atakent',
    ...atakumCoord(1.6, 90),
    bio: 'Atakent’teki atölyemde telefon ekran, batarya ve şarj soketi değişimi yapıyorum. Çoğu tamir aynı gün teslim; tüm parçalar garantili.',
    emergency: 'Yok',
    price: 'STARTING',
    amount: 1200,
    yearsExperience: 10,
    // Atölye her gün açık (openNow için 07:00 UTC = yerel 10:00).
    opensAt: '07:00',
    closesAt: '21:00',
    rating: 4.6,
    reviewCount: 210,
    responseMinutes: 10,
    regions: [{ name: 'Atakum', approxKm: null }, { name: 'İlkadım', approxKm: 6 }],
    named: [
      { sub: 'demo-yorumcu-9', firstName: 'Onur', lastName: 'N.', rating: 5, daysAgo: 2, title: 'Ekran değişimi', body: 'Ekranı 40 dakikada değişti, orijinal kalite. Süper.' },
      { sub: 'demo-yorumcu-10', firstName: 'Berk', lastName: 'B.', rating: 4, daysAgo: 6, title: 'Batarya değişimi', body: 'Fiyat performans iyi, işini biliyor.' },
    ],
  },
  // ── 6) Kombi — genel, sabit fiyat (Yeşiltepe, ~2.8 km) ──────────────────
  {
    sub: 'demo-nadir-baris',
    firstName: 'Nadir',
    lastName: 'Barış',
    categorySlug: 'kombi',
    district: 'Yeşiltepe',
    ...atakumCoord(2.8, 250),
    bio: 'Kombi arıza, bakım ve petek temizliği yapıyorum. Tüm marka kombilerde yetkili servis deneyimim var. Yeşiltepe ve Atakum genelinde kış öncesi bakım için gelebiliyorum.',
    emergency: 'Var',
    price: 'FIXED',
    amount: 150,
    yearsExperience: 11,
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
  // ── 7) Tadilat — yeni/yorumsuz #1 (Cumhuriyet, ~1.9 km) ─────────────────
  {
    sub: 'demo-yagmur-aslan',
    firstName: 'Yavuz',
    lastName: 'Aslan',
    categorySlug: 'tadilat',
    district: 'Cumhuriyet',
    ...atakumCoord(1.9, 20),
    bio: 'Banyo ve mutfak yenileme, fayans ve alçıpan işleri yapıyorum. Atakum’da yeni başladım; işçiliğime güveniyorum.',
    emergency: 'Yok',
    price: 'NEGOTIABLE',
    yearsExperience: 5,
    subServices: ['Banyo yenileme', 'Mutfak yenileme', 'Fayans / seramik'],
    opensAt: '09:00',
    closesAt: '18:00',
    rating: null, // yeni — hiç yorum yok
    reviewCount: 0,
    noGallery: true, // yeni ustanın iş örneği yok
    named: [],
  },
  // ── 8) Kombi — az yorumlu, hafta içi acil (İncesu, ~2.4 km) ─────────────
  {
    sub: 'demo-deniz-aksoy',
    firstName: 'Deniz',
    lastName: 'Aksoy',
    categorySlug: 'kombi',
    district: 'İncesu',
    ...atakumCoord(2.4, 110),
    bio: 'Kombi bakım ve arıza servisi. İncesu ve Atakum çevresinde hafta içi hızlı destek veriyorum.',
    emergency: 'Hafta içi',
    price: 'NEGOTIABLE',
    yearsExperience: 6,
    opensAt: '09:00',
    closesAt: '19:00',
    // Yeni katılan usta — henüz yorumu yok (reviews e2e bu ustayı temiz seçer).
    rating: null,
    reviewCount: 0,
    noGallery: true,
    named: [],
  },
  // ── 9) Kombi — TEK MARKA uzmanı (Vaillant+Bosch), köklü + ÖDEME ─────────
  {
    sub: 'demo-okan-yucel',
    firstName: 'Okan',
    lastName: 'Yücel',
    categorySlug: 'kombi',
    district: 'Güzelyalı',
    ...atakumCoord(3.1, 240),
    bio: 'Yalnızca Vaillant ve Bosch kombilerde uzmanlaştım; bu iki markanın yetkili servis eğitimlerini aldım. 15 yıldır Atakum ve Güzelyalı’da arıza, bakım ve gaz emniyeti işleri yapıyorum.',
    emergency: 'Var',
    price: 'STARTING',
    amount: 450,
    yearsExperience: 15,
    brands: ['Vaillant', 'Bosch'],
    opensAt: '08:00',
    closesAt: '19:00',
    rating: 4.9,
    reviewCount: 167,
    responseMinutes: 12,
    regions: [
      { name: 'Atakum', approxKm: null },
      { name: 'İlkadım', approxKm: 6 },
      { name: 'Tekkeköy', approxKm: 18 },
    ],
    payments: [
      { amount: 1800, status: 'RELEASED', title: 'Vaillant kombi arıza + gaz emniyet', daysAgo: 6, customerFirst: 'Bülent', customerLast: 'Aksoy', note: 'Kombi arızası + yıllık bakım' },
      { amount: 950, status: 'SECURED', title: 'Bosch kombi yıllık bakım', daysAgo: 2, customerFirst: 'Sibel', customerLast: 'Karaca' },
    ],
    named: [
      { sub: 'demo-yorumcu-14', firstName: 'Cengiz', lastName: 'D.', rating: 5, daysAgo: 2, title: 'Vaillant kombi arıza', body: 'Vaillant kombimi tek seferde çözdü, parçayı da yanında getirmişti. İşin ehli.' },
      { sub: 'demo-yorumcu-15', firstName: 'Aylin', lastName: 'S.', rating: 5, daysAgo: 9, title: 'Bosch kombi bakım', body: 'Sadece bu iki markaya baktığı için çok bilgili. Bakım sonrası fatura da düştü.' },
    ],
  },
  // ── 10) Klima — TEK MARKA uzmanı (Daikin+Mitsubishi), 5.0 + ÖDEME ───────
  {
    sub: 'demo-tolga-sen',
    firstName: 'Tolga',
    lastName: 'Şen',
    categorySlug: 'klima',
    district: 'Çatalçam',
    ...atakumCoord(4.2, 70),
    bio: 'Yalnızca Daikin ve Mitsubishi inverter klimalar üzerine çalışıyorum. Isı pompası ve VRV sistemlerde sertifikalıyım; Çatalçam ve Atakum’da montaj ve devreye alma yapıyorum.',
    emergency: 'Yok',
    price: 'STARTING',
    amount: 750,
    yearsExperience: 13,
    brands: ['Daikin', 'Mitsubishi'],
    subServices: ['Montaj', 'Bakım'],
    opensAt: '08:30',
    closesAt: '18:30',
    rating: 5.0,
    reviewCount: 89,
    responseMinutes: 16,
    payments: [
      { amount: 4200, status: 'RELEASED', title: 'Daikin inverter klima montaj', daysAgo: 8, customerFirst: 'Erhan', customerLast: 'Bozkurt', note: 'Salon + yatak odası montaj' },
    ],
    named: [
      { sub: 'demo-yorumcu-16', firstName: 'Deniz', lastName: 'K.', rating: 5, daysAgo: 3, title: 'Daikin montaj', body: 'İki Daikin kliması taktı, bakır boru işçiliği kusursuzdu. Markaya hakim.' },
      { sub: 'demo-yorumcu-17', firstName: 'Seda', lastName: 'M.', rating: 5, daysAgo: 12, title: 'Mitsubishi bakım', body: 'Mitsubishi klimamın bakımını yaptı, çok titiz ve dakik biri.' },
    ],
  },
  // ── 11) Telefon — TEK MARKA (Apple+Samsung), atölye, çok yorumlu + ÖDEME ─
  {
    sub: 'demo-kerem-aydin',
    firstName: 'Kerem',
    lastName: 'Aydın',
    categorySlug: 'telefon',
    district: 'Atakent',
    ...atakumCoord(1.4, 130),
    bio: 'Atakent’teki atölyemde yalnızca Apple ve Samsung cihazlara servis veriyorum. iPhone ekran/batarya ve Samsung anakart onarımında 10 yıllık deneyim; orijinal parça garantisi.',
    emergency: 'Yok',
    price: 'STARTING',
    amount: 900,
    yearsExperience: 10,
    brands: ['Apple', 'Samsung'],
    opensAt: '07:00',
    closesAt: '20:00',
    rating: 4.8,
    reviewCount: 243,
    responseMinutes: 8,
    regions: [{ name: 'Atakum', approxKm: null }, { name: 'İlkadım', approxKm: 6 }],
    payments: [
      { amount: 3400, status: 'RELEASED', title: 'iPhone 13 ekran + batarya', daysAgo: 5, customerFirst: 'Yasin', customerLast: 'Ertaş', note: 'Ekran + batarya değişimi' },
      { amount: 1650, status: 'RELEASED', title: 'Samsung S22 şarj soketi', daysAgo: 11, customerFirst: 'Pelin', customerLast: 'Aydemir' },
    ],
    named: [
      { sub: 'demo-yorumcu-18', firstName: 'Emir', lastName: 'T.', rating: 5, daysAgo: 1, title: 'iPhone ekran', body: 'iPhone ekranımı orijinaliyle değişti, aynı gün teslim. Fiyatı da net söyledi.' },
      { sub: 'demo-yorumcu-19', firstName: 'Buse', lastName: 'A.', rating: 5, daysAgo: 5, title: 'Samsung batarya', body: 'Samsung’a özel çalıştığı belli, çok bilgili. Bataryayı garantili taktı.' },
    ],
  },
  // ── 12) Oto bakım — NİŞ detailing (seramik + PPF), Gtechniq+Gyeon + ÖDEME ─
  {
    sub: 'demo-baris-ozturk',
    firstName: 'Barış',
    lastName: 'Öztürk',
    categorySlug: 'oto-bakim',
    district: 'Denizevleri',
    ...atakumCoord(2.0, 340),
    bio: 'Oto detailing ve seramik/grafen kaplama uzmanıyım; yalnızca Gtechniq ve Gyeon ürünleriyle çalışıyorum. Denizevleri’ndeki atölyemde PPF boya koruma ve pasta cila yapıyorum, talep halinde mobil geliyorum.',
    emergency: 'Yok',
    price: 'STARTING',
    amount: 3500,
    yearsExperience: 7,
    brands: ['Gtechniq', 'Gyeon'],
    subServices: ['Seramik kaplama', 'Boya koruma (PPF)', 'Pasta cila'],
    opensAt: '09:00',
    closesAt: '19:00',
    rating: 4.9,
    reviewCount: 76,
    responseMinutes: 20,
    payments: [
      { amount: 6500, status: 'RELEASED', title: 'Seramik kaplama (tüm araç)', daysAgo: 7, customerFirst: 'Tuncay', customerLast: 'Şeker', note: '9H seramik kaplama' },
      { amount: 2800, status: 'SECURED', title: 'Pasta cila + iç detay', daysAgo: 1, customerFirst: 'Gökhan', customerLast: 'Uçar' },
    ],
    named: [
      { sub: 'demo-yorumcu-20', firstName: 'Sinan', lastName: 'K.', rating: 5, daysAgo: 4, title: 'Seramik kaplama', body: 'Aracıma Gtechniq seramik yaptı, araba pırıl pırıl oldu. İşine aşık biri.' },
      { sub: 'demo-yorumcu-21', firstName: 'Melis', lastName: 'D.', rating: 5, daysAgo: 10, title: 'PPF boya koruma', body: 'Ön kaputa PPF çekti, hiç kabarcık yok. Fiyatı hak ediyor.' },
    ],
  },
  // ── 13) Oto bakım — genel mobil yıkama/detay (İncesu, ~2.6 km) ──────────
  {
    sub: 'demo-ugur-demirci',
    firstName: 'Uğur',
    lastName: 'Demirci',
    categorySlug: 'oto-bakim',
    district: 'İncesu',
    ...atakumCoord(2.6, 160),
    bio: 'Mobil oto yıkama ve iç detaylı temizlik yapıyorum; adresinize gelip aracınızı yıkıyorum. İncesu ve Atakum sahilinde pasta cila ve koltuk şampuanı hizmeti veriyorum.',
    emergency: 'Var',
    price: 'NEGOTIABLE',
    yearsExperience: 6,
    brands: ['Meguiars', '3M', 'CarPro'],
    subServices: ['Mobil yıkama', 'İç detaylı temizlik', 'Pasta cila'],
    opensAt: '08:00',
    closesAt: '20:00',
    rating: 4.7,
    reviewCount: 134,
    responseMinutes: 14,
    named: [
      { sub: 'demo-yorumcu-22', firstName: 'Kaan', lastName: 'B.', rating: 5, daysAgo: 2, title: 'Mobil yıkama', body: 'Kapıya geldi, aracı içi dışı tertemiz yaptı. Çok pratik.' },
      { sub: 'demo-yorumcu-23', firstName: 'Ece', lastName: 'Y.', rating: 4, daysAgo: 8, title: 'İç detay temizlik', body: 'Koltukları şampuanladı, leke kalmadı. Biraz geç geldi ama iş güzel.' },
    ],
  },
  // ── 14) Pet bakım — NİŞ köpek kuaförü, kadın usta, çok yorumlu + ÖDEME ──
  {
    sub: 'demo-elif-sahin',
    firstName: 'Elif',
    lastName: 'Şahin',
    categorySlug: 'pet-bakim',
    district: 'Güzelyalı',
    ...atakumCoord(3.6, 210),
    bio: 'Köpek kuaförüyüm; yalnızca köpek tıraşı, tırnak ve pati bakımı yapıyorum. Güzelyalı’daki salonuma getirebilir ya da evde bakım için çağırabilirsiniz. Küçük ırklarda ve yaşlı köpeklerde çok sabırlıyım.',
    emergency: 'Yok',
    price: 'STARTING',
    amount: 400,
    yearsExperience: 8,
    brands: ['Andis', 'Wahl'],
    subServices: ['Köpek tıraşı', 'Tırnak kesimi', 'Kulak / diş bakımı', 'Evde bakım'],
    opensAt: '09:30',
    closesAt: '19:00',
    rating: 4.9,
    reviewCount: 188,
    responseMinutes: 11,
    payments: [
      { amount: 550, status: 'RELEASED', title: 'Pomeranian tıraş + tırnak', daysAgo: 4, customerFirst: 'Damla', customerLast: 'Kaya', note: 'Tıraş + tırnak + kulak' },
      { amount: 480, status: 'RELEASED', title: 'Maltese evde bakım', daysAgo: 13, customerFirst: 'Berna', customerLast: 'Öz' },
    ],
    named: [
      { sub: 'demo-yorumcu-24', firstName: 'İrem', lastName: 'A.', rating: 5, daysAgo: 2, title: 'Köpek tıraşı', body: 'Pomeranian’ımı çok güzel tıraş etti, köpeğim hiç strese girmedi. Ellerine sağlık.' },
      { sub: 'demo-yorumcu-25', firstName: 'Ceren', lastName: 'B.', rating: 5, daysAgo: 6, title: 'Tırnak + pati bakımı', body: 'Yaşlı köpeğimin tırnaklarını sabırla kesti. Eve geldiği için çok rahat ettik.' },
    ],
  },
  // ── 15) Güzellik — NİŞ evde bakım, kadın usta + ÖDEME (Mimarsinan) ──────
  {
    sub: 'demo-merve-yalcin',
    firstName: 'Merve',
    lastName: 'Yalçın',
    categorySlug: 'guzellik',
    district: 'Mimarsinan',
    ...atakumCoord(1.7, 230),
    bio: 'Evde güzellik ve bakım hizmeti veriyorum: manikür-pedikür, ağda ve cilt bakımı. Kendi steril malzememle Mimarsinan ve Atakum’daki adresinize geliyorum. Gelin ve özel gün paketlerim de var.',
    emergency: 'Yok',
    price: 'NEGOTIABLE',
    yearsExperience: 9,
    brands: ['OPI', 'Kodi'],
    subServices: ['Manikür / pedikür', 'Ağda / epilasyon', 'Cilt bakımı'],
    opensAt: '10:00',
    closesAt: '20:00',
    rating: 4.8,
    reviewCount: 156,
    responseMinutes: 13,
    payments: [
      { amount: 900, status: 'RELEASED', title: 'Manikür + ağda paketi', daysAgo: 5, customerFirst: 'Zehra', customerLast: 'Aksu', note: 'Evde bakım paketi' },
    ],
    named: [
      { sub: 'demo-yorumcu-26', firstName: 'Gizem', lastName: 'T.', rating: 5, daysAgo: 1, title: 'Evde manikür', body: 'Eve geldi, kalıcı ojemi kusursuz yaptı. Malzemeleri çok hijyenik.' },
      { sub: 'demo-yorumcu-27', firstName: 'Sevil', lastName: 'K.', rating: 4, daysAgo: 7, title: 'Ağda', body: 'Ağdada çok hızlı ve az acıtan bir teknik kullanıyor. Memnun kaldım.' },
    ],
  },
  // ── 16) Tadilat — genel usta, geniş kapsam, acil (Aksu, ~4.5 km) ────────
  {
    sub: 'demo-serdar-kilic',
    firstName: 'Serdar',
    lastName: 'Kılıç',
    categorySlug: 'tadilat',
    district: 'Aksu',
    ...atakumCoord(4.5, 300),
    bio: 'Komple daire tadilatı yapıyorum: banyo-mutfak yenileme, alçıpan, fayans ve laminat parke. 18 yıllık ekibimle Aksu, Taflan ve Atakum genelinde anahtar teslim iş alıyorum.',
    emergency: 'Var',
    price: 'NEGOTIABLE',
    yearsExperience: 18,
    opensAt: '08:00',
    closesAt: '19:00',
    rating: 4.8,
    reviewCount: 97,
    responseMinutes: 24,
    regions: [
      { name: 'Atakum', approxKm: null },
      { name: 'İlkadım', approxKm: 8 },
      { name: 'Canik', approxKm: 14 },
    ],
    named: [
      { sub: 'demo-yorumcu-28', firstName: 'Hakan', lastName: 'D.', rating: 5, daysAgo: 3, title: 'Banyo yenileme', body: 'Banyoyu komple yeniledi, işçilik ve temizlik on numara. Söz verdiği günde bitirdi.' },
      { sub: 'demo-yorumcu-29', firstName: 'Nazlı', lastName: 'E.', rating: 4, daysAgo: 12, title: 'Mutfak tadilat', body: 'Mutfak dolabı ve fayansları değişti. Sonuç güzel, süreç biraz uzadı.' },
    ],
  },
  // ── 17) Cam & balkon — uzman (Taflan, ~5.2 km) ──────────────────────────
  {
    sub: 'demo-metin-cakir',
    firstName: 'Metin',
    lastName: 'Çakır',
    categorySlug: 'cam-balkon',
    district: 'Taflan',
    ...atakumCoord(5.2, 350),
    bio: 'Cam balkon, PVC pencere ve sineklik montajı yapıyorum. Isıcamlı sürme sistemler ve katlanır cam balkonda uzmanım; Taflan ve Atakum sahil sitelerine montaj yapıyorum.',
    emergency: 'Yok',
    price: 'NEGOTIABLE',
    yearsExperience: 12,
    brands: ['Albert Genau', 'Winsa'],
    subServices: ['Cam balkon', 'PVC pencere', 'Sineklik'],
    opensAt: '08:30',
    closesAt: '18:30',
    rating: 4.7,
    reviewCount: 64,
    responseMinutes: 26,
    named: [
      { sub: 'demo-yorumcu-30', firstName: 'Volkan', lastName: 'S.', rating: 5, daysAgo: 4, title: 'Cam balkon', body: 'Balkonu katlanır camla kapattı, çok düzgün çalıştı. Ses ve toz kesildi.' },
      { sub: 'demo-yorumcu-31', firstName: 'Aysun', lastName: 'M.', rating: 4, daysAgo: 15, title: 'PVC pencere', body: 'Pencereleri değişti, yalıtım iyi oldu. Randevuya birkaç gün geç kaldı.' },
    ],
  },
  // ── 18) Mobilya montaj — IKEA kurulum uzmanı (Esenevler, ~3.0 km) ───────
  {
    sub: 'demo-onur-kaplan',
    firstName: 'Onur',
    lastName: 'Kaplan',
    categorySlug: 'mobilya-montaj',
    district: 'Esenevler',
    ...atakumCoord(3.0, 50),
    bio: 'Hazır mobilya kurulumu yapıyorum: IKEA, Bellona ve İstikbal gardırop, mutfak dolabı ve TV ünitesi montajı. Esenevler ve Atakum’da taşınma sonrası söküm-montaj da yapıyorum.',
    emergency: 'Yok',
    price: 'STARTING',
    amount: 350,
    yearsExperience: 7,
    subServices: ['Gardırop / dolap', 'Mutfak dolabı', 'Raf / TV ünitesi', 'Söküm & taşıma montajı'],
    opensAt: '09:00',
    closesAt: '19:00',
    rating: 4.9,
    reviewCount: 112,
    responseMinutes: 17,
    named: [
      { sub: 'demo-yorumcu-32', firstName: 'Barış', lastName: 'A.', rating: 5, daysAgo: 2, title: 'Gardırop montaj', body: 'IKEA gardırobumu bir saatte kurdu, hiç parça artmadı. Çok pratik ve temiz.' },
      { sub: 'demo-yorumcu-33', firstName: 'Tuğçe', lastName: 'K.', rating: 5, daysAgo: 9, title: 'TV ünitesi', body: 'TV ünitesini duvara sağlam monte etti. İşini biliyor, tavsiye ederim.' },
    ],
  },
  // ── 19) Bahçe & peyzaj — mevsimlik, bugün kapalı (Çatalçam, ~4.8 km) ────
  {
    sub: 'demo-kadir-toprak',
    firstName: 'Kadir',
    lastName: 'Toprak',
    categorySlug: 'bahce',
    district: 'Çatalçam',
    ...atakumCoord(4.8, 60),
    bio: 'Bahçe bakımı ve peyzaj düzenleme yapıyorum: çim biçme, ağaç budama ve otomatik sulama sistemi kurulumu. Çatalçam ve Atakum villa bölgelerinde mevsimlik bakım anlaşmaları yapıyorum.',
    emergency: 'Yok',
    price: 'NEGOTIABLE',
    yearsExperience: 10,
    brands: ['Husqvarna', 'Stihl'],
    subServices: ['Çim biçme', 'Ağaç / çalı budama', 'Sulama sistemi'],
    opensAt: '08:00',
    closesAt: '18:00',
    closedToday: true, // "Yarın uygun"
    rating: 4.6,
    reviewCount: 38,
    responseMinutes: 28,
    named: [
      { sub: 'demo-yorumcu-34', firstName: 'Serkan', lastName: 'B.', rating: 5, daysAgo: 5, title: 'Çim biçme + budama', body: 'Bahçeyi baştan sona düzenledi, çimleri ve çalıları çok güzel kesti.' },
      { sub: 'demo-yorumcu-35', firstName: 'Deniz', lastName: 'A.', rating: 4, daysAgo: 18, title: 'Sulama sistemi', body: 'Damla sulama kurdu, çalışıyor. Fiyatı biraz yüksekti ama iş sağlam.' },
    ],
  },
  // ── 20) Halı yıkama — yeni/yorumsuz #2 (Yeşiltepe, ~2.2 km) ─────────────
  {
    sub: 'demo-selim-ates',
    firstName: 'Selim',
    lastName: 'Ateş',
    categorySlug: 'hali-yikama',
    district: 'Yeşiltepe',
    ...atakumCoord(2.2, 280),
    bio: 'Halı, koltuk ve perde yıkama hizmeti veriyorum. Atakum’da yeni açtım; adresten alıp yıkayıp teslim ediyorum, yerinde koltuk temizliği de yapıyorum.',
    emergency: 'Yok',
    price: 'NEGOTIABLE',
    yearsExperience: 3,
    opensAt: '09:00',
    closesAt: '19:00',
    rating: null, // yeni — hiç yorum yok
    reviewCount: 0,
    noGallery: true,
    named: [],
  },
];

// ─── Gerçekçi yorum metinleri (iyi + kötü) ─────────────────────────────────
// Toplu yorumlar bu havuzlardan deterministik seçilir; yıldıza göre olumlu,
// nötr ya da olumsuz metin atanır. Ustaların ratingAvg'i yıldızlardan doğar.
const GOOD_REVIEWS = [
  'İşini gerçekten biliyor, geldiği gibi sorunu çözdü. Çok memnun kaldım.',
  'Çok titiz ve temiz çalıştı, hiç kir bırakmadı. Tavsiye ederim.',
  'Randevuya dakik geldi, güler yüzlü ve ilgiliydi. Ellerine sağlık.',
  'Fiyatı baştan net söyledi, sürpriz çıkmadı. İşçilik kusursuz.',
  'Aynı gün geldi ve hızlıca hallettı. İletişimi çok iyiydi.',
  'Uzun süredir bu kadar işinin ehli birine denk gelmemiştim. Harika.',
  'Sorunu doğru teşhis etti, gereksiz masraf çıkarmadı. Dürüst usta.',
  'Detaylara çok önem veriyor, sonuç beklediğimden iyi oldu.',
  'Kibar, temiz ve çözüm odaklı. Bir daha mutlaka onu ararım.',
  'Malzemeyi de kaliteli kullandı, garanti verdi. İçim rahat.',
  'İşi bitince ortalığı toplayıp gitti, çok düzgün bir insan.',
  'Telefonda anlattığım sorunu tam anladı, gelince tek seferde çözdü.',
  'Hem hızlı hem özenli. Komşulara da tavsiye ettim.',
  'Fiyat/performans çok iyi, işini severek yapan bir usta.',
  'Zamanında geldi, işini profesyonelce yaptı, teşekkürler.',
  'Sabırlı ve açıklayıcı, her adımı anlattı. Çok memnunum.',
];
const NEUTRAL_REVIEWS = [
  'İş fena değildi ama biraz geç geldi. Sonuçta halloldu.',
  'Ortalama bir hizmet, fiyatı biraz yüksekti ama iş gördü.',
  'Genel olarak iyiydi, küçük bir eksik kaldı ama idare eder.',
  'İşini yaptı ancak iletişim biraz zayıftı. Yine de sorun çözüldü.',
  'Beklediğim kadar olmadı ama kötü de değildi.',
];
const BAD_REVIEWS = [
  'Randevuya saatlerce geç geldi, sürekli erteledi. Hiç memnun kalmadım.',
  'Söylediği fiyatın çok üstünde para istedi, iş de yarım kaldı.',
  'İşi düzgün yapmadı, birkaç gün sonra aynı sorun tekrar çıktı.',
  'İletişimi çok kötüydü, telefonlara bile zor cevap verdi.',
  'Ortalığı berbat etti, temizlemeden gitti. Kesinlikle tavsiye etmem.',
  'Parayı aldı ama iş beklediğim gibi olmadı, pişman oldum.',
  'Gelmeyi sürekli erteledi, sonunda başka usta buldum.',
  'Kaba davrandı, yaptığı iş de kalitesizdi. Bir daha aramam.',
  'Fiyatta anlaştık ama sonradan ekstra ücret çıkardı. Güven vermedi.',
  'İşi aceleye getirdi, sonuç hiç iç açıcı değil.',
  'Söz verdiği gün gelmedi, haber bile vermedi.',
  'Kullandığı malzeme kalitesizdi, kısa sürede bozuldu.',
];

/** Basit deterministik string hash (metin/örüntü seçimi için). */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

/** Yıldıza göre deterministik yorum metni (4-5★'ın bir kısmı metinsiz). */
function reviewTextFor(rating: number, i: number, salt: string): string {
  const h = hashStr(salt);
  if (rating <= 2) return BAD_REVIEWS[(i + h) % BAD_REVIEWS.length];
  if (rating === 3) return NEUTRAL_REVIEWS[(i + h) % NEUTRAL_REVIEWS.length];
  // 4-5★: yaklaşık %55'i metinli (gerçekte herkes yorum yazmaz).
  if (((i * 7 + h) % 100) < 55) {
    return GOOD_REVIEWS[(i + h) % GOOD_REVIEWS.length];
  }
  return '';
}

/**
 * n yorumu, toplamı TAM `sum` olacak şekilde 1-5 yıldıza dağıtır.
 * DOĞAL J-EĞRİSİ: 5★ en sık, ardından 4★, 3★, 2★, 1★ azalan sıklıkta
 * (5>4>3>2≈1). Yüksek ortalamalı ustada 5★ ağırlıklı, düşük ortalamalıda
 * mass 1-3★'a kayar. Toplam tam tutturulduğu için ROUND(AVG,1) hedefe oturur.
 *
 * Yöntem: her yorumu "5 − ceza" olarak düşün. Toplam ceza = 5n − hedef.
 * Cezayı katmanlara böl: L[k] = cezası ≥ (k+1) olan yorum sayısı; katmanlar
 * geometrik olarak azalır (L[0]≥L[1]≥L[2]≥L[3]) → 4★>3★>2★>1★ doğal eğrisi.
 */
function generateRatingsForSum(n: number, sum: number): number[] {
  if (n <= 0) return [];
  const target = Math.max(n * 1, Math.min(n * 5, Math.round(sum)));
  const ratings = new Array<number>(n).fill(5);
  const D = 5 * n - target; // dağıtılacak toplam ceza (0..4n)
  if (D <= 0) return ratings;

  // Katman hedef boyutları: geometrik azalış (ρ) ile 4★>3★>2★>1★.
  const rho = 0.42;
  const w = [1, rho, rho * rho, rho * rho * rho];
  const wsum = w[0] + w[1] + w[2] + w[3];
  const L = [0, 0, 0, 0];
  for (let k = 0; k < 4; k++) L[k] = Math.round((D * w[k]) / wsum);
  // Üst sınır (L[0]≤n) + azalmayan (non-increasing) düzeni zorla.
  L[0] = Math.min(L[0], n);
  for (let k = 1; k < 4; k++) L[k] = Math.min(L[k], L[k - 1]);

  // Toplam cezayı (Σ L) tam D'ye oturt.
  let cur = L[0] + L[1] + L[2] + L[3];
  while (cur < D) {
    // En sığ büyüyebilen katmana ekle (4★ baskınlığını korur).
    let added = false;
    for (let k = 0; k < 4; k++) {
      const upper = k === 0 ? n : L[k - 1];
      if (L[k] < upper) {
        L[k]++;
        cur++;
        added = true;
        break;
      }
    }
    if (!added) break;
  }
  while (cur > D) {
    // En derin dolu katmandan çıkar (alt kuyruğu minimumda tutar).
    let removed = false;
    for (let k = 3; k >= 0; k--) {
      const lower = k === 3 ? 0 : L[k + 1];
      if (L[k] > lower) {
        L[k]--;
        cur--;
        removed = true;
        break;
      }
    }
    if (!removed) break;
  }

  // Katman sayılarından yıldız sayıları: 1★=L[3], 2★=L[2]-L[3], ...
  const cnt = [
    L[3], // 1★
    L[2] - L[3], // 2★
    L[1] - L[2], // 3★
    L[0] - L[1], // 4★
  ];
  let idx = 0;
  for (let star = 1; star <= 4; star++) {
    for (let c = 0; c < cnt[star - 1]; c++) ratings[idx++] = star;
  }
  // Kalanlar 5★ olarak kalır.
  return ratings;
}

// ─── Beykoz (İstanbul) usta dünyası — ~200 gerçekçi usta ───────────────────
// Yavuz Sultan Selim köprüsünün Anadolu yakası. Merkez 41.105, 29.095.
// Ustalar Boğaz hattı mahallelerine küçük ofsetlerle yayılır; PostGIS
// discover sorgusu mesafeyi bu noktalardan hesaplar.
const BEYKOZ_CENTER = { lat: 41.105, lng: 29.095 };
const BEYKOZ_NEIGHBORHOODS = [
  'Kavacık', 'Anadoluhisarı', 'Kanlıca', 'Çubuklu', 'Paşabahçe',
  'Beykoz Merkez', 'Göksu', 'Yalıköy', 'İncirköy', 'Rüzgarlıbahçe',
  'Riva', 'Poyrazköy', 'Ortaçeşme', 'Tokatköy',
];
const MALE_FIRST = [
  'Mehmet', 'Ahmet', 'Mustafa', 'Hüseyin', 'İbrahim', 'Ali', 'Hasan',
  'Osman', 'Yusuf', 'Murat', 'Ömer', 'Kemal', 'Fatih', 'Emre', 'Serkan',
  'Tolga', 'Volkan', 'Burak', 'Cem', 'Selim', 'Kadir', 'Onur', 'Barış',
  'Uğur', 'Metin', 'Okan', 'Kerem', 'Hakan', 'Nadir', 'Serdar', 'Yavuz',
  'Erhan', 'Gökhan', 'Tuncay', 'Sinan', 'Levent', 'Engin', 'Taner',
  'Cengiz', 'Ferhat', 'Recep', 'Ramazan', 'Bülent', 'Coşkun', 'Devrim',
  'Ekrem', 'Halil', 'İsmail', 'Kaan', 'Şükrü',
];
const FEMALE_FIRST = [
  'Elif', 'Zeynep', 'Merve', 'Fatma', 'Aslı', 'Derya', 'Pınar', 'Esra',
  'Hale', 'Gül', 'Sema', 'Nur', 'Ceren', 'İrem', 'Gizem', 'Sevil',
  'Damla', 'Berna', 'Selin', 'Yağmur', 'Ayşe', 'Emine', 'Hatice', 'Melis',
  'Seda', 'Buse', 'Tuğçe', 'Nazlı', 'Aylin', 'Sibel', 'Zehra', 'Gamze',
  'Ece', 'Rana', 'Cansu', 'Duygu', 'Özge', 'Şeyma', 'Büşra', 'Dilara',
];
const TURK_LAST = [
  'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Yıldırım',
  'Öztürk', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan',
  'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek', 'Polat', 'Korkmaz',
  'Çakır', 'Erdoğan', 'Yavuz', 'Güneş', 'Aksoy', 'Bozkurt', 'Taş',
  'Aktaş', 'Bulut', 'Kaplan', 'Ateş', 'Turan', 'Sarı', 'Erdem', 'Koçak',
  'Avcı', 'Acar', 'Karaca', 'Deniz', 'Yalçın', 'Güler', 'Ünal', 'Toprak',
  'Karaman', 'Demirci', 'Uçar', 'Şeker', 'Aydemir',
];
// Kategoriye özel doğal iş adı (ek almayan isim tamlaması; açılış şablonlarına
// gömülür — "beyaz eşya tamiri işiyle uğraşıyorum" gibi doğal okunur).
const CAT_NOUN: Record<string, string> = {
  elektrik: 'elektrik ve aydınlatma',
  'su-tesisati': 'su tesisatı ve tıkanıklık açma',
  boya: 'boya ve badana',
  klima: 'klima montaj ve bakımı',
  kombi: 'kombi bakımı ve arıza onarımı',
  temizlik: 'ev ve ofis temizliği',
  telefon: 'telefon tamiri',
  bilgisayar: 'bilgisayar tamiri ve teknik destek',
  'beyaz-esya': 'beyaz eşya tamiri',
  marangoz: 'marangozluk ve ahşap',
  cilingir: 'çilingir ve kilit',
  nakliye: 'nakliye ve taşımacılık',
  'pet-bakim': 'evcil hayvan bakımı',
  'oto-bakim': 'oto bakım ve detailing',
  tadilat: 'tadilat ve iç mekan yenileme',
  guzellik: 'güzellik ve cilt bakımı',
  kuafor: 'kuaförlük ve saç bakımı',
  bahce: 'bahçe bakımı ve peyzaj',
  'mobilya-montaj': 'mobilya montajı',
  'cam-balkon': 'cam balkon ve PVC pencere',
  ilaclama: 'ilaçlama ve haşere kontrolü',
  'hali-yikama': 'halı ve koltuk yıkama',
};
// Açılış şablonları: mahalle adına EK KOYMAZ ("bölgesinde/ve çevresinde/
// civarında/ve yakın mahallelerde"). Böylece her mahallede gramer doğru.
const BIO_OPENINGS: Array<(d: string, y: number, n: string) => string> = [
  (d, y, n) => `${d} bölgesinde ${y} yıldır ${n} işiyle uğraşıyorum`,
  (d, y, n) => `${y} yıldır ${d} ve çevresinde ${n} hizmeti veriyorum`,
  (d, y, n) => `${d} civarında ${n} konusunda ${y} yıllık deneyimim var`,
  (d, y, n) => `${d} ve yakın mahallelerde ${y} yıldır ${n} işi yapıyorum`,
  (d, y, n) => `${d} bölgesinde ${n} alanında ${y} yıldır çalışıyorum`,
];
// Kategoriye özel bio cümleleri (4-5 doğal varyant) — tekdüzeliği kırar.
const CAT_CLAUSE: Record<string, string[]> = {
  elektrik: ['pano-sigorta yenileme, priz ve aydınlatma arızalarında hızlı çözüm sunuyorum', 'kaçak akım, topraklama ve arıza tespitinde titiz çalışırım', 'ev ve iş yeri tesisatını standartlara uygun döşerim', 'avize-aplik montajı ve akıllı ev sistemlerinde deneyimliyim', 'sigorta atması ve kısa devre sorunlarını kalıcı çözerim'],
  'su-tesisati': ['tıkanıklık açma, kaçak tespiti ve batarya montajında deneyimliyim', 'su kaçağını kırmadan bulur, temiz onarım yaparım', 'petek, gider ve pissu hattı sorunlarını kalıcı çözerim', 'banyo-mutfak tesisat yenileme ve armatür değişimi yaparım', 'kombi ve şofben su bağlantılarında da yardımcı olurum'],
  boya: ['iç cephe, dekoratif ve saten boyada toz kontrollü çalışırım', 'alçı, tavan ve duvar boyasında pürüzsüz sonuç veririm', 'eski boyayı raspalayıp astar üstüne düzgün uygularım', 'daire, villa ve ofis boyasında temiz ve hızlı ilerlerim', 'rutubet ve çatlak onarımı sonrası kalıcı boya yaparım'],
  klima: ['split ve VRF montaj, gaz dolumu ve bakımda uzmanım', 'montaj ve devreye almada kablo işçiliğine önem veririm', 'iç-dış ünite bakımı ve filtre temizliğini eksiksiz yaparım', 'inverter sistemlerde arıza ve gaz kaçağı onarımı yaparım', 'demontaj-montaj ve yer değişikliğinde titiz çalışırım'],
  kombi: ['arıza, yıllık bakım ve petek temizliğini eksiksiz yaparım', 'gaz emniyeti ve verimli ısınma için titiz bakım sunarım', 'kombi gaz açma, ateşleme ve basınç sorunlarını çözerim', 'tüm marka kombilerde yetkili servis deneyimim var', 'kış öncesi bakım ve devreye alma işlerini yaparım'],
  temizlik: ['ev, ofis ve inşaat sonrası detaylı temizlik yapıyorum', 'kendi ekipmanımla hızlı ve titiz temizlik sağlarım', 'cam, mutfak ve ıslak alanlarda derinlemesine temizlik yaparım', 'düzenli haftalık ve aylık temizlik anlaşmaları yapıyorum', 'taşınma öncesi ve sonrası kapsamlı temizlik veririm'],
  telefon: ['ekran, batarya ve şarj soketi değişimini aynı gün yaparım', 'anakart ve teşhis işlerinde garantili parça kullanırım', 'suya düşen cihazlarda kurtarma ve onarım yapıyorum', 'tüm model telefonlarda hızlı ve garantili tamir sunarım', 'kamera ve hoparlör arızalarında orijinal parça takarım'],
  bilgisayar: ['format, donanım yükseltme ve virüs temizliği yapıyorum', 'yavaşlayan cihazlara hızlı ve kalıcı çözüm sunarım', 'SSD takma, RAM yükseltme ve ısınma sorunlarını çözerim', 'masaüstü ve dizüstü tamirinde yerinde servis veriyorum', 'veri kurtarma ve işletim sistemi kurulumu yapıyorum'],
  'beyaz-esya': ['buzdolabı, çamaşır ve bulaşık makinesi arızalarına bakarım', 'yerinde arıza tespiti ve orijinal parçayla onarım yaparım', 'fırın, ocak ve kurutma makinesi tamirinde deneyimliyim', 'tüm marka beyaz eşyada garantili tamir sunuyorum', 'su akıtma ve ısıtmama arızalarını hızlı çözerim'],
  marangoz: ['mobilya tamiri, kapı ayarı ve ölçülü imalat yapıyorum', 'ahşap onarım ve montajda ince işçilik sunarım', 'gardırop, raf ve mutfak dolabı imalatı yapıyorum', 'kapı-pencere ayarı ve menteşe değişiminde hızlıyım', 'ölçüye özel ahşap ürün ve dekor işleri yaparım'],
  cilingir: ['kapı açma ve kilit değişiminde 7/24 hızlı geliyorum', 'çelik kapı ve otomobil kilitlerinde deneyimliyim', 'kasa, kilit ve barel değişiminde güvenli çözüm sunarım', 'anahtar kopyalama ve kilit takviyesi yapıyorum', 'kapıda hasar bırakmadan açma konusunda tecrübeliyim'],
  nakliye: ['evden eve ve parça eşya taşımada özenli ekiple çalışırım', 'asansörlü, sigortalı ve zamanında taşıma yaparım', 'ambalajlama, söküm-montaj ve şehir içi taşıma yapıyorum', 'ofis ve ev taşımada eşyayı koruyarak paketlerim', 'tek parça ve beyaz eşya taşımada da yardımcı olurum'],
  'pet-bakim': ['köpek tıraşı, tırnak ve pati bakımını sabırla yaparım', 'küçük ırk ve yaşlı dostlarda çok sakin çalışırım', 'ırka özel tıraş, yıkama ve kulak-tırnak bakımı yaparım', 'evde ya da salonda strese sokmadan bakım sunarım', 'düğüm açma ve mevsimlik kürk bakımında deneyimliyim'],
  'oto-bakim': ['mobil yıkama, iç detay ve seramik kaplama yapıyorum', 'pasta cila ve boya koruma işlerinde titizim', 'motor ve koltuk detaylı temizliğinde özenli çalışırım', 'grafen kaplama ve PPF uygulamasında deneyimliyim', 'adrese gelip aracı içi dışı tertemiz teslim ederim'],
  tadilat: ['banyo-mutfak yenileme, fayans ve alçıpan işleri yapıyorum', 'anahtar teslim daire tadilatında zamanında bitiririm', 'zemin, seramik ve laminat parke uygulaması yaparım', 'ekibimle komple iç mekan yenileme işleri alıyorum', 'alçıpan, boya ve elektrik-su revizyonunu birlikte yaparım'],
  guzellik: ['evde manikür-pedikür, ağda ve cilt bakımı yapıyorum', 'steril malzememle adresinize gelip bakım sunuyorum', 'kalıcı oje, protez tırnak ve kaş tasarımı yapıyorum', 'gelin ve özel gün bakım paketlerim var', 'cilt analizi ve leke bakımında kişiye özel çalışırım'],
  kuafor: ['evde saç kesimi, sakal ve fön hizmeti veriyorum', 'saç boyası ve bakımda kişiye özel çalışırım', 'topuz, gelin saçı ve fön modellerinde deneyimliyim', 'erkek ve kadın saç kesiminde adresinize geliyorum', 'keratin ve bakım uygulamalarında titiz çalışırım'],
  bahce: ['çim biçme, budama ve otomatik sulama kurulumu yapıyorum', 'peyzaj düzenleme ve mevsimlik bakım anlaşmaları yaparım', 'ağaç budama, çim ekimi ve gübreleme yapıyorum', 'bahçe temizliği ve bitki bakımında düzenli hizmet veririm', 'çit, çim ve sulama sistemi kurulumunda deneyimliyim'],
  'mobilya-montaj': ['hazır mobilya, gardırop ve mutfak dolabı montajı yaparım', 'söküm-taşıma sonrası hızlı ve sağlam kurulum sunarım', 'IKEA, Bellona ve İstikbal ürünlerini eksiksiz kurarım', 'TV ünitesi, raf ve yatak montajında pratiğim', 'taşınmada söküp yeniden kurma işini üstlenirim'],
  'cam-balkon': ['cam balkon, PVC pencere ve sineklik montajı yapıyorum', 'katlanır ısıcamlı sistemlerde ses ve toz yalıtımı sağlarım', 'sürme cam sistemleri ve panjur montajı yapıyorum', 'ölçü alıp ısıcamlı balkon kapatmayı temiz uygularım', 'cam değişimi ve conta yenilemede de yardımcı olurum'],
  ilaclama: ['böcek, kemirgen ve tahtakurusu ilaçlaması yapıyorum', 'ruhsatlı ilaçla kokusuz, garantili dezenfeksiyon sunarım', 'hamamböceği ve karınca için kalıcı çözüm uygularım', 'ev, iş yeri ve bahçede periyodik ilaçlama yaparım', 'sinek ve kene mücadelesinde etkili yöntem kullanırım'],
  'hali-yikama': ['halı, koltuk ve perde yıkama hizmeti veriyorum', 'adresten alıp yıkar, yerinde koltuk temizliği yaparım', 'leke ve koku çıkarma işleminde özel çözümler kullanırım', 'antibakteriyel yıkama ve hızlı teslimat sunuyorum', 'yün ve makine halılarında uygun programla yıkarım'],
};
const CAT_BASE: Record<string, number> = {
  elektrik: 300, 'su-tesisati': 350, boya: 3000, klima: 650, kombi: 500,
  temizlik: 900, telefon: 1200, bilgisayar: 500, 'beyaz-esya': 550,
  marangoz: 800, cilingir: 400, nakliye: 2500, 'pet-bakim': 400,
  'oto-bakim': 1500, tadilat: 5000, guzellik: 700, kuafor: 350, bahce: 1200,
  'mobilya-montaj': 400, 'cam-balkon': 4000, ilaclama: 1000, 'hali-yikama': 600,
};
const FEMALE_LEANING = new Set(['guzellik', 'kuafor', 'pet-bakim']);
const BIO_CLOSINGS = [
  'Aynı gün randevu verebiliyorum.',
  'Temiz ve garantili iş çıkarırım, memnuniyet önceliğimdir.',
  'Boğaz hattı ve çevre mahallelere gelebiliyorum.',
  'İşimi severek yapıyorum; dürüstlük ve titizlik ilkemdir.',
  'Acil çağrılara da bakıyorum, hızlı dönüş yaparım.',
  'İşi söz verdiğim günde ve fiyatta bitiririm.',
  'Uygun fiyat ve kaliteli işçilik için arayabilirsiniz.',
  'Detayları sohbette netleştirip net fiyat veririm.',
];

/** mulberry32 — deterministik sözde-rastgele üreteç (index tohumlu). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ~200 Beykoz ustasını deterministik üretir (idempotent: sabit sub'lar). */
function buildBeykozPros(): DemoPro[] {
  const catSlugs = categories.map((c) => c.slug);
  const catName = new Map(categories.map((c) => [c.slug, c.name]));
  const catBrands = new Map(categories.map((c) => [c.slug, c.brands ?? []]));
  const out: DemoPro[] = [];
  const TOTAL = 200;
  for (let i = 0; i < TOTAL; i++) {
    const r = mulberry32(i * 2654435761 + 101);
    const slug = catSlugs[i % catSlugs.length];
    const female = FEMALE_LEANING.has(slug) ? r() < 0.7 : r() < 0.05;
    const first = female
      ? FEMALE_FIRST[Math.floor(r() * FEMALE_FIRST.length)]
      : MALE_FIRST[Math.floor(r() * MALE_FIRST.length)];
    const last = TURK_LAST[Math.floor(r() * TURK_LAST.length)];
    const district = BEYKOZ_NEIGHBORHOODS[i % BEYKOZ_NEIGHBORHOODS.length];

    // Konum: merkeze göre 0.4–6 km, rastgele yön.
    const dist = 0.4 + r() * 5.6;
    const ang = r() * 2 * Math.PI;
    const lat = BEYKOZ_CENTER.lat + dist * Math.cos(ang) * KM_PER_DEG_LAT;
    const lng = BEYKOZ_CENTER.lng + dist * Math.sin(ang) * KM_PER_DEG_LNG;

    const years = 2 + Math.floor(r() * 24);
    // Bio: mahalle adına EK KOYMAYAN açılış (bölgesinde/ve çevresinde/...) +
    // kategoriye özel doğal cümle (4-5 varyant) + çeşitli kapanış.
    const noun = CAT_NOUN[slug] ?? (catName.get(slug) ?? '').toLowerCase();
    const opening =
      BIO_OPENINGS[Math.floor(r() * BIO_OPENINGS.length)](district, years, noun);
    const clauses = CAT_CLAUSE[slug] ?? [];
    const clause = clauses.length
      ? clauses[Math.floor(r() * clauses.length)]
      : '';
    const closing = BIO_CLOSINGS[Math.floor(r() * BIO_CLOSINGS.length)];
    const bio = clause
      ? `${opening}; ${clause}. ${closing}`
      : `${opening}. ${closing}`;

    // Fiyat yaklaşımı + tutar (kategoriye göre taban).
    const pk = r();
    const price: DemoPro['price'] =
      pk < 0.45 ? 'NEGOTIABLE' : pk < 0.8 ? 'STARTING' : 'FIXED';
    const base = CAT_BASE[slug] ?? 500;
    const amount =
      price === 'NEGOTIABLE'
        ? undefined
        : Math.round((base * (0.8 + r() * 0.6)) / 10) * 10;

    const emergency =
      r() < 0.4 ? 'Var' : r() < 0.7 ? 'Yok' : 'Hafta içi';
    const opensAt = ['08:00', '08:30', '09:00', '09:30', '10:00'][Math.floor(r() * 5)];
    const closesAt = ['18:00', '18:30', '19:00', '20:00', '21:00'][Math.floor(r() * 5)];
    const closedToday = r() < 0.12;

    // ~%14 yeni/doğrulanmamış usta: yayında değil, yorumsuz.
    const isNew = r() < 0.14;
    let rating: number | null;
    let reviewCount: number;
    if (isNew) {
      rating = null;
      reviewCount = 0;
    } else {
      // Gerçek kalite yelpazesi: pazaryerinde çok iyi / iyi / orta / kötü
      // ustalar bir arada. Yorum sayısı 3–70.
      const q = r();
      if (q < 0.13) {
        // ~%13 DÜŞÜK ortalamalı (kötü/orta) usta: 2.6–3.6.
        rating = Math.round((2.6 + r() * 1.0) * 10) / 10;
      } else if (q < 0.3) {
        // ~%17 orta-iyi usta: 3.7–4.3.
        rating = Math.round((3.7 + r() * 0.6) * 10) / 10;
      } else {
        // ~%70 iyi–çok iyi usta: 4.4–5.0.
        rating = Math.round((4.4 + r() * 0.6) * 10) / 10;
      }
      reviewCount = 3 + Math.floor(r() * 68);
    }

    // Marka uzmanlığı: markası olan kategorilerde bazen tek/çift markaya odak.
    const brands = catBrands.get(slug) ?? [];
    let chosenBrands: string[] | undefined;
    if (brands.length > 0 && r() < 0.45) {
      const k = 1 + Math.floor(r() * Math.min(2, brands.length));
      chosenBrands = brands.slice(0, k);
    }

    // Ödeme geçmişi: doğrulanmış ustaların ~%28'ine 1-2 kayıt.
    let payments: PaymentSeed[] | undefined;
    if (!isNew && r() < 0.28) {
      const n = 1 + (r() < 0.4 ? 1 : 0);
      payments = Array.from({ length: n }, (_, k) => {
        const amt = Math.round((base * (1 + r() * 3)) / 50) * 50;
        return {
          amount: Math.max(300, amt),
          status: (r() < 0.6 ? 'RELEASED' : 'SECURED') as PaymentSeed['status'],
          title: `${catName.get(slug)} hizmeti`,
          daysAgo: 1 + Math.floor(r() * 25),
          customerFirst:
            MALE_FIRST[Math.floor(r() * MALE_FIRST.length)],
          customerLast: TURK_LAST[Math.floor(r() * TURK_LAST.length)],
        };
      });
    }

    out.push({
      sub: `demo-usta-bkz-${i + 1}`,
      firstName: first,
      lastName: last,
      categorySlug: slug,
      district,
      city: 'İstanbul',
      lat,
      lng,
      bio,
      emergency,
      price,
      amount,
      yearsExperience: years,
      brands: chosenBrands,
      regions: [
        { name: district, approxKm: null },
        { name: 'Kavacık', approxKm: Math.round(dist * 10) / 10 },
        { name: 'Üsküdar', approxKm: Math.round((dist + 8) * 10) / 10 },
      ],
      payments,
      opensAt,
      closesAt,
      closedToday,
      rating,
      reviewCount,
      responseMinutes: isNew ? undefined : 8 + Math.floor(r() * 30),
      noGallery: isNew,
      verificationStatus: isNew ? 'IN_REVIEW' : 'VERIFIED',
      isPublished: !isNew,
      named: [],
    });
  }
  return out;
}

// Beykoz ustalarını ana listeye ekle (idempotent — sabit sub'lar).
demoPros.push(...buildBeykozPros());

// Toplu (metinsiz) yorumların müşterileri: demo-musteri-1..N.
// Aynı müşteri + aynı usta çifti tek sohbet olabildiğinden (unique)
// en kalabalık ustanın yorum sayısı kadar müşteri gerekir; en az 100 müşteri.
const DEMO_CUSTOMER_COUNT = Math.max(
  100,
  ...demoPros.map((p) => p.reviewCount - p.named.length),
);
// Müşteri isim havuzu: kadın+erkek karışık, geniş soyad havuzu (100+ müşteri).
const CUSTOMER_FIRST = MALE_FIRST.flatMap((m, idx) =>
  idx < FEMALE_FIRST.length ? [m, FEMALE_FIRST[idx]] : [m],
);
const CUSTOMER_LAST = TURK_LAST;

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
  const demoUser = await prisma.user.upsert({
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

  // "İki mod tek hesap": demo giriş hesabına dolu bir USTA vitrini bağlanır,
  // böylece aynı hesap hem müşteri hem usta modunda uçtan uca test edilir.
  await seedDemoKullaniciPro(demoUser.id);

  await backfillAvatars();

  const counts = {
    categories: await prisma.category.count(),
    subServices: await prisma.subService.count(),
    brands: await prisma.brand.count(),
    pros: await prisma.proProfile.count(),
    users: await prisma.user.count(),
    reviews: await prisma.review.count(),
    goodReviews: await prisma.review.count({ where: { rating: { gte: 4 } } }),
    badReviews: await prisma.review.count({ where: { rating: { lte: 2 } } }),
    payments: await prisma.payment.count(),
    addresses: await prisma.address.count(),
  };
  console.log('Seed tamam:', counts);
}

/**
 * Avatarları (temsili çizim, gerçek kişi DEĞİL) demo kullanıcılara deterministik
 * atar. Usta seti → seed-assets/avatars/ustas, kullanıcı seti → .../users.
 * providerSub hash'i ile 1..40 arası dosya seçilir. İdempotent + stale DB'de de
 * çalışır (mevcut satırları da günceller). Harici URL YOK, repoya gömülü dosya.
 */
async function backfillAvatars() {
  const proSubs = demoPros.map((p) => p.sub);
  // Ustalar (+ iki-mod tek hesap demo-kullanici): "ustas" seti.
  await prisma.$executeRaw`
    UPDATE users SET "avatarUrl" =
      '/seed-assets/avatars/ustas/usta-'
      || to_char(((hashtext("providerSub") % 40) + 40) % 40 + 1, 'FM00')
      || '.png'
    WHERE "providerSub" = ANY(${proSubs}) OR "providerSub" = 'demo-kullanici'`;
  // Müşteriler / yorumcular / ödeme müşterileri / gelen iş / admin: "users" seti.
  await prisma.$executeRaw`
    UPDATE users SET "avatarUrl" =
      '/seed-assets/avatars/users/user-'
      || to_char(((hashtext("providerSub") % 40) + 40) % 40 + 1, 'FM00')
      || '.png'
    WHERE "providerSub" LIKE 'demo-musteri-%'
       OR "providerSub" LIKE 'demo-yorumcu-%'
       OR "providerSub" LIKE 'demo-odeme-%'
       OR "providerSub" LIKE 'demo-kullanici-isi-%'
       OR "providerSub" = 'demo-admin'`;
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

  // 100 müşteriye ev adresi: yarısı Atakum (Samsun), yarısı Beykoz (İstanbul).
  // "İki lokasyonda yaşayan müşteri" verisi. İdempotent: önce sil, sonra kur.
  const featured = bulkCustomers.slice(0, 100);
  await prisma.address.deleteMany({
    where: { userId: { in: featured.map((c) => c.id) } },
  });
  const ATAKUM_MAH = [
    'Denizevleri Mah.', 'Mimarsinan Mah.', 'Körfez Mah.', 'Atakent Mah.',
    'Cumhuriyet Mah.', 'Esenevler Mah.', 'Yeşiltepe Mah.', 'Balaç Mah.',
  ];
  const BEYKOZ_MAH = [
    'Kavacık Mah.', 'Anadoluhisarı Mah.', 'Kanlıca Mah.', 'Çubuklu Mah.',
    'Paşabahçe Mah.', 'Göksu Mah.', 'Yalıköy Mah.', 'Ortaçeşme Mah.',
  ];
  await prisma.address.createMany({
    data: featured.map((c, i) => {
      const beykoz = i % 2 === 1;
      const mah = beykoz
        ? BEYKOZ_MAH[i % BEYKOZ_MAH.length]
        : ATAKUM_MAH[i % ATAKUM_MAH.length];
      return {
        userId: c.id,
        title: 'Ev',
        city: beykoz ? 'İstanbul' : 'Samsun',
        district: beykoz ? 'Beykoz' : 'Atakum',
        fullText: `${mah}, ${(i % 40) + 1}. Sk. No:${(i % 30) + 1} D:${(i % 12) + 1}, ${beykoz ? 'Beykoz/İstanbul' : 'Atakum/Samsun'}`,
      };
    }),
  });

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

  // Uygulama içi ödeme müşterileri (kararlı sub → idempotent). Her ödeme
  // kaydının kendi ödeme müşterisi olur; ustanın (müşteri,usta) tekilliği
  // ve yorum müşterileriyle çakışma yaşanmaz.
  await prisma.user.createMany({
    data: demoPros.flatMap((p) =>
      (p.payments ?? []).map((pay, idx) => ({
        provider: 'GOOGLE' as const,
        providerSub: `demo-odeme-${p.sub}-${idx}`,
        email: `demo-odeme-${p.sub}-${idx}@ornek.iste`,
        firstName: pay.customerFirst,
        lastName: pay.customerLast,
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
        yearsExperience: demo.yearsExperience ?? null,
        latitude: demo.lat,
        longitude: demo.lng,
        city: demo.city ?? 'Samsun',
        district: demo.district,
        emergency: demo.emergency,
        maxDistanceKm: 12,
        verificationStatus: demo.verificationStatus ?? 'VERIFIED',
        isPublished: demo.isPublished ?? true,
      },
      create: {
        userId: user.id,
        mainCategoryId: category.id,
        bio: demo.bio,
        serviceMode,
        priceApproach: demo.price,
        priceAmount: demo.amount,
        yearsExperience: demo.yearsExperience,
        city: demo.city ?? 'Samsun',
        district: demo.district,
        emergency: demo.emergency,
        latitude: demo.lat,
        longitude: demo.lng,
        maxDistanceKm: 12,
        verificationStatus: demo.verificationStatus ?? 'VERIFIED',
        isPublished: demo.isPublished ?? true,
      },
    });

    // Alt hizmet seçimi: demo.subServices verilmişse o alt küme, yoksa hepsi.
    const chosenSubServices = demo.subServices
      ? category.subServices.filter((s) => demo.subServices!.includes(s.name))
      : category.subServices;
    await prisma.proProfileSubService.deleteMany({
      where: { proProfileId: profile.id },
    });
    await prisma.proProfileSubService.createMany({
      data: chosenSubServices.map((s) => ({
        proProfileId: profile.id,
        subServiceId: s.id,
      })),
    });

    // Marka uzmanlığı: demo.brands verilmişse o alt küme, yoksa hepsi.
    const chosenBrands = demo.brands
      ? category.brands.filter((b) => demo.brands!.includes(b.name))
      : category.brands;
    await prisma.proProfileBrand.deleteMany({
      where: { proProfileId: profile.id },
    });
    await prisma.proProfileBrand.createMany({
      data: chosenBrands.map((b) => ({
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
    // Hizmet bölgeleri: demo.regions verilmişse o, yoksa Atakum varsayılanı.
    await prisma.proRegion.createMany({
      data: (demo.regions ?? DEFAULT_REGIONS).map((r) => ({
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
    await seedDemoPayments(demo, profile.id, user.id);
  }
}

/**
 * Uygulama içi ödeme geçmişi. Her ödeme kendi Conversation → ServiceRecord
 * (COMPLETED) → Payment (+ PaymentEvent zaman çizgisi) zincirini kurar.
 * Kazanç ekranı RELEASED (aktarıldı) + SECURED (güvencede) toplamlarını
 * requestedByUserId=usta üzerinden okur; komisyon %2 ustadan kesilir.
 */
async function seedDemoPayments(
  demo: DemoPro,
  proProfileId: string,
  proUserId: string,
) {
  if (!demo.payments || demo.payments.length === 0) return;

  const paymentCustomers = await prisma.user.findMany({
    where: { providerSub: { startsWith: `demo-odeme-${demo.sub}-` } },
    select: { id: true, providerSub: true },
  });

  const now = Date.now();
  const DAY = 86_400_000;

  for (const [idx, pay] of demo.payments.entries()) {
    const customer = paymentCustomers.find(
      (c) => c.providerSub === `demo-odeme-${demo.sub}-${idx}`,
    );
    if (!customer) continue;

    const commissionAmount = Math.round(pay.amount * 0.02 * 100) / 100;
    const netAmount = Math.round((pay.amount - commissionAmount) * 100) / 100;
    const paidAt = new Date(now - pay.daysAgo * DAY);
    const requestedAt = new Date(paidAt.getTime() - 30 * 60_000);

    const conversationId = randomUUID();
    const recordId = randomUUID();
    const paymentId = randomUUID();

    await prisma.conversation.create({
      data: {
        id: conversationId,
        customerId: customer.id,
        proProfileId,
        createdAt: new Date(paidAt.getTime() - DAY),
        lastMessageAt: paidAt,
      },
    });
    await prisma.serviceRecord.create({
      data: {
        id: recordId,
        conversationId,
        status: 'COMPLETED',
        title: pay.title,
        agreedAmount: pay.amount,
        createdAt: new Date(paidAt.getTime() - DAY),
      },
    });
    await prisma.payment.create({
      data: {
        id: paymentId,
        conversationId,
        serviceRecordId: recordId,
        requestedByUserId: proUserId,
        paidByUserId: customer.id,
        amount: pay.amount,
        commissionRate: 0.02,
        commissionAmount,
        netAmount,
        note: pay.note ?? null,
        status: pay.status,
        providerRef: `demo-${paymentId.slice(0, 8)}`,
        createdAt: requestedAt,
        updatedAt: paidAt,
      },
    });

    // Ödeme durumu zaman çizgisi (ödeme detayında görünür).
    const events: Array<{
      status: 'REQUESTED' | 'SECURED' | 'RELEASED';
      at: Date;
    }> = [
      { status: 'REQUESTED', at: requestedAt },
      { status: 'SECURED', at: paidAt },
    ];
    if (pay.status === 'RELEASED') {
      events.push({ status: 'RELEASED', at: new Date(paidAt.getTime() + DAY) });
    }
    await prisma.paymentEvent.createMany({
      data: events.map((e) => ({
        paymentId,
        status: e.status,
        createdAt: e.at,
      })),
    });
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
          { providerSub: { startsWith: 'demo-odeme-' } },
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

  // Yıldız dağılımı: toplam yorum çoğunluğu 5-4★, gerçekçilik için birkaç
  // GERÇEK kötü (1-2★) ve nötr (3★) yorum. ROUND(AVG,1) hedef puana oturur.
  // Metinli (named) yorumların yıldız toplamı düşülür; kalanı bulkSum'a dağılır.
  const bulkCount = demo.reviewCount - demo.named.length;
  const totalSum = Math.round(demo.rating * demo.reviewCount);
  const namedSum = demo.named.reduce((s, n) => s + n.rating, 0);
  const bulkSum = totalSum - namedSum;
  const bulkRatings = generateRatingsForSum(bulkCount, bulkSum);

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

  // 2) Toplu yorumlar — iyi + kötü + nötr metin karışımı, named'lerden ESKİ.
  const oldestNamedDays = Math.max(0, ...demo.named.map((n) => n.daysAgo));
  const subServiceNames = category.subServices.map((s) => s.name);
  for (let i = 0; i < bulkCount; i++) {
    const rating = bulkRatings[i];
    const body = reviewTextFor(rating, i, demo.sub);
    const daysAgo = oldestNamedDays + 3 + Math.round(i * 2.2);
    pushReview(
      bulkCustomers[i].id,
      rating,
      body,
      subServiceNames[i % subServiceNames.length] ?? category.name,
      new Date(now - daysAgo * DAY - (i % 12) * 3_600_000),
      i % 2 === 0, // yarısı doğrulanmış işlem (ödemeyle)
      body !== '', // metinli yorumlar alt puan da taşır
    );
  }

  await prisma.conversation.createMany({ data: conversations });
  await prisma.serviceRecord.createMany({ data: records });
  await prisma.review.createMany({ data: reviews });

  // 3) Prototip responseTime — müşteri mesajı + usta yanıtı çifti.
  // Named yoksa (Beykoz ustaları) ilk toplu sohbet üzerinden hesaplanır.
  void namedConversationIds;
  if (demo.responseMinutes != null && conversations.length > 0) {
    const conversationId = conversations[0].id;
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

/**
 * Demo giriş hesabına (demo-kullanici) bağlı YAYINLANMIŞ, DOLU bir usta
 * vitrini. "İki mod tek hesap" felsefesi: aynı hesap hem MÜŞTERİ hem USTA
 * modunda uçtan uca test edilir. Yalnız usta tarafını EKLER — müşteri
 * senaryolarındaki veriye (favoriler, adresler, Okan ile sohbet/ödeme/yorum)
 * DOKUNMAZ; o veride demo-kullanici müşteridir (proProfileId farklı).
 *
 * Gelen işlerin müşterileri `demo-kullanici-isi-*` prefixiyle ayrılır;
 * idempotent temizlik yalnız bu prefixe ve bu ustanın profiline göre yapılır.
 */
async function seedDemoKullaniciPro(demoUserId: string) {
  const category = await prisma.category.findUnique({
    where: { slug: 'elektrik' },
    include: { subServices: true, brands: true },
  });
  if (!category) return;

  // İş örneği görselleri diske yazılır (idempotent — aynı 4 webp).
  const galleryUrls = await seedGalleryImages();

  const coord = atakumCoord(0.6, 45); // Atakum merkez civarı (~41.32 / 36.33)
  const bio =
    'Atakum ve Samsun genelinde 9 yıldır elektrik işleri yapıyorum. ' +
    'Sigorta/pano yenileme, priz-anahtar, aydınlatma ve arıza tespitinde ' +
    'hızlı ve temiz çözüm sunarım. Denizevleri, Mimarsinan ve Körfez ' +
    'hattına aynı gün gelebiliyorum; acil çağrılara da bakıyorum.';

  const profile = await prisma.proProfile.upsert({
    where: { userId: demoUserId },
    update: {
      mainCategoryId: category.id,
      bio,
      serviceMode: 'ON_SITE',
      priceApproach: 'STARTING',
      priceAmount: 250,
      yearsExperience: 9,
      latitude: coord.lat,
      longitude: coord.lng,
      city: 'Samsun',
      district: 'Denizevleri',
      emergency: 'Var',
      maxDistanceKm: 12,
      verificationStatus: 'VERIFIED',
      isPublished: true,
    },
    create: {
      userId: demoUserId,
      mainCategoryId: category.id,
      bio,
      serviceMode: 'ON_SITE',
      priceApproach: 'STARTING',
      priceAmount: 250,
      yearsExperience: 9,
      latitude: coord.lat,
      longitude: coord.lng,
      city: 'Samsun',
      district: 'Denizevleri',
      emergency: 'Var',
      maxDistanceKm: 12,
      verificationStatus: 'VERIFIED',
      isPublished: true,
    },
  });

  // Alt hizmetler (elektrik: Priz / anahtar, Aydınlatma, Pano, Arıza).
  const chosenSubs = category.subServices.filter((s) =>
    ['Priz / anahtar', 'Aydınlatma', 'Pano', 'Arıza'].includes(s.name),
  );
  await prisma.proProfileSubService.deleteMany({
    where: { proProfileId: profile.id },
  });
  await prisma.proProfileSubService.createMany({
    data: chosenSubs.map((s) => ({
      proProfileId: profile.id,
      subServiceId: s.id,
    })),
  });

  // Marka uzmanlığı (Schneider, Legrand, Viko).
  const chosenBrands = category.brands.filter((b) =>
    ['Schneider', 'Legrand', 'Viko'].includes(b.name),
  );
  await prisma.proProfileBrand.deleteMany({
    where: { proProfileId: profile.id },
  });
  await prisma.proProfileBrand.createMany({
    data: chosenBrands.map((b) => ({ proProfileId: profile.id, brandId: b.id })),
  });

  // Hizmet bölgeleri (Atakum mahalleleri + merkez).
  await prisma.proRegion.deleteMany({ where: { proProfileId: profile.id } });
  await prisma.proRegion.createMany({
    data: [
      { proProfileId: profile.id, name: 'Denizevleri', approxKm: 1.2 },
      { proProfileId: profile.id, name: 'Mimarsinan', approxKm: 2.0 },
      { proProfileId: profile.id, name: 'Körfez', approxKm: 0.9 },
      { proProfileId: profile.id, name: 'Atakum', approxKm: null },
    ],
  });

  // Çalışma saatleri: Pzt–Cmt 09:00–19:00 açık, Pazar (7) kapalı.
  await prisma.workingHour.deleteMany({ where: { proProfileId: profile.id } });
  await prisma.workingHour.createMany({
    data: [1, 2, 3, 4, 5, 6, 7].map((day) => ({
      proProfileId: profile.id,
      dayOfWeek: day,
      isOpen: day !== 7,
      opensAt: '09:00',
      closesAt: '19:00',
    })),
  });

  // Galeri (mevcut demo-work-N.webp iş görselleri).
  await prisma.proGalleryImage.deleteMany({
    where: { proProfileId: profile.id },
  });
  await prisma.proGalleryImage.createMany({
    data: galleryUrls.map((url, i) => ({
      proProfileId: profile.id,
      url,
      title: GALLERY_TITLES[i],
      sortOrder: i,
    })),
  });

  // Hizmet & fiyat kartları (prototip proServices — aktif/pasif toggle'lı).
  await prisma.proService.deleteMany({ where: { proProfileId: profile.id } });
  await prisma.proService.createMany({
    data: [
      {
        proProfileId: profile.id,
        title: 'Sigorta / otomat değişimi',
        mode: 'Yerinde',
        priceType: 'Başlangıç',
        priceAmount: 250,
        sortOrder: 0,
      },
      {
        proProfileId: profile.id,
        title: 'Avize / aplik montajı',
        mode: 'Yerinde',
        priceType: 'Sabit fiyat',
        priceAmount: 400,
        sortOrder: 1,
      },
      {
        proProfileId: profile.id,
        title: 'Genel elektrik arıza tespiti',
        mode: 'Yerinde',
        priceType: 'Fiyat konuşulur',
        priceAmount: null,
        sortOrder: 2,
      },
    ],
  });

  // Doğrulama belgeleri: kimlik APPROVED, ustalık IN_REVIEW, kalan ikisi
  // MISSING → doğrulama ekranı karışık durum gösterir (upsert: docType unique).
  const docs: Array<{
    docType: string;
    title: string;
    status: string;
    url: string | null;
  }> = [
    { docType: 'identity', title: 'Kimlik doğrulama', status: 'APPROVED', url: '/uploads/demo-work-1.webp' },
    { docType: 'mastery', title: 'Ustalık belgesi', status: 'IN_REVIEW', url: '/uploads/demo-work-2.webp' },
    { docType: 'license', title: 'Doğalgaz yetki belgesi', status: 'MISSING', url: null },
    { docType: 'address-tax', title: 'Adres / vergi bilgisi', status: 'MISSING', url: null },
  ];
  for (const d of docs) {
    await prisma.proDocument.upsert({
      where: {
        proProfileId_docType: { proProfileId: profile.id, docType: d.docType },
      },
      update: { title: d.title, status: d.status, url: d.url },
      create: {
        proProfileId: profile.id,
        docType: d.docType,
        title: d.title,
        status: d.status,
        url: d.url,
      },
    });
  }

  // ── Gelen işler + kazanç (demo-kullanici USTA olarak) ──────────────────
  // Her iş: ayrı demo müşteri → Conversation → ServiceRecord(COMPLETED)
  // → Payment (%2 komisyon ustadan) → PaymentEvent zaman çizgisi → Review.
  // En az 1 RELEASED (aktarıldı) + 1 SECURED (güvencede).
  const incomingJobs: Array<{
    customerFirst: string;
    customerLast: string;
    title: string;
    amount: number;
    status: 'RELEASED' | 'SECURED';
    daysAgo: number;
    rating: number;
    body: string;
  }> = [
    { customerFirst: 'Bülent', customerLast: 'Aksoy', title: 'Sigorta panosu yenileme', amount: 1200, status: 'RELEASED', daysAgo: 6, rating: 5, body: 'Panoyu baştan sona yeniledi, kaçak akım rölesi de taktı. Temiz ve güvenli iş çıkardı.' },
    { customerFirst: 'Sibel', customerLast: 'Karaca', title: 'Salon avize + spot montajı', amount: 1600, status: 'RELEASED', daysAgo: 12, rating: 5, body: 'Salon avizesini ve spotları çok düzgün monte etti. Kablo işçiliği kusursuz.' },
    { customerFirst: 'Erhan', customerLast: 'Bozkurt', title: 'Kaçak akım arıza tespiti', amount: 850, status: 'SECURED', daysAgo: 2, rating: 4, body: 'Arızayı hızlı buldu ve çözdü. Biraz geç geldi ama işini biliyor.' },
  ];

  // Gelen iş müşterileri (kararlı sub → idempotent).
  await prisma.user.createMany({
    data: incomingJobs.map((j, i) => ({
      provider: 'GOOGLE' as const,
      providerSub: `demo-kullanici-isi-${i}`,
      email: `demo-kullanici-isi-${i}@ornek.iste`,
      firstName: j.customerFirst,
      lastName: j.customerLast,
    })),
    skipDuplicates: true,
  });
  const jobCustomers = await prisma.user.findMany({
    where: { providerSub: { startsWith: 'demo-kullanici-isi-' } },
    select: { id: true, providerSub: true },
  });

  // İdempotens: bu ustanın gelen-iş sohbetleri silinir (cascade: hizmet
  // kaydı + ödeme + yorum + mesaj). demo-kullanici'nin MÜŞTERİ sohbetleri
  // (Okan vb.) etkilenmez — onlarda proProfileId bu profile ait değildir.
  await prisma.conversation.deleteMany({
    where: {
      proProfileId: profile.id,
      customer: { providerSub: { startsWith: 'demo-kullanici-isi-' } },
    },
  });

  const now = Date.now();
  const DAY = 86_400_000;
  for (const [idx, job] of incomingJobs.entries()) {
    const customer = jobCustomers.find(
      (c) => c.providerSub === `demo-kullanici-isi-${idx}`,
    );
    if (!customer) continue;

    const commissionAmount = Math.round(job.amount * 0.02 * 100) / 100;
    const netAmount = Math.round((job.amount - commissionAmount) * 100) / 100;
    const paidAt = new Date(now - job.daysAgo * DAY);
    const requestedAt = new Date(paidAt.getTime() - 30 * 60_000);

    const conversationId = randomUUID();
    const recordId = randomUUID();
    const paymentId = randomUUID();

    await prisma.conversation.create({
      data: {
        id: conversationId,
        customerId: customer.id,
        proProfileId: profile.id,
        createdAt: new Date(paidAt.getTime() - DAY),
        lastMessageAt: paidAt,
      },
    });
    await prisma.serviceRecord.create({
      data: {
        id: recordId,
        conversationId,
        status: 'COMPLETED',
        title: job.title,
        agreedAmount: job.amount,
        createdAt: new Date(paidAt.getTime() - DAY),
      },
    });
    await prisma.payment.create({
      data: {
        id: paymentId,
        conversationId,
        serviceRecordId: recordId,
        requestedByUserId: demoUserId,
        paidByUserId: customer.id,
        amount: job.amount,
        commissionRate: 0.02,
        commissionAmount,
        netAmount,
        status: job.status,
        providerRef: `demo-${paymentId.slice(0, 8)}`,
        createdAt: requestedAt,
        updatedAt: paidAt,
      },
    });

    const events: Array<{
      status: 'REQUESTED' | 'SECURED' | 'RELEASED';
      at: Date;
    }> = [
      { status: 'REQUESTED', at: requestedAt },
      { status: 'SECURED', at: paidAt },
    ];
    if (job.status === 'RELEASED') {
      events.push({ status: 'RELEASED', at: new Date(paidAt.getTime() + DAY) });
    }
    await prisma.paymentEvent.createMany({
      data: events.map((e) => ({ paymentId, status: e.status, createdAt: e.at })),
    });

    // Yorum: kazanç ekranında "Doğrulanmış işlem" + usta panelinde puan.
    await prisma.review.create({
      data: {
        serviceRecordId: recordId,
        proProfileId: profile.id,
        customerId: customer.id,
        rating: job.rating,
        communication: job.rating,
        punctuality: job.rating,
        workmanship: job.rating,
        body: job.body,
        isVerified: true,
        createdAt: paidAt,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
