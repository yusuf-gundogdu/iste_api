/**
 * Standalone avatar backfill — her deploy'da (docker-entrypoint) çalışır.
 * Tam reseed'e gerek kalmadan avatarları SENTETİK gerçekçi yüzlere +
 * CİNSİYET-EŞLEŞMELİ olarak günceller. İdempotent: aynı sonucu tekrar yazar.
 *
 * Usta = pro_profiles'ta kaydı olan kullanıcı → seed-assets/avatars/ustas
 *   (usta-m-01..40 / usta-f-01..18). Diğer demo kullanıcılar → .../users
 *   (user-m-01..20 / user-f-01..17). Kadın = firstName FEMALE_FIRST havuzunda.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const FEMALE_FIRST = [
  'Elif', 'Zeynep', 'Merve', 'Fatma', 'Aslı', 'Derya', 'Pınar', 'Esra',
  'Hale', 'Gül', 'Sema', 'Nur', 'Ceren', 'İrem', 'Gizem', 'Sevil',
  'Damla', 'Berna', 'Selin', 'Yağmur', 'Ayşe', 'Emine', 'Hatice', 'Melis',
  'Seda', 'Buse', 'Tuğçe', 'Nazlı', 'Aylin', 'Sibel', 'Zehra', 'Gamze',
  'Ece', 'Rana', 'Cansu', 'Duygu', 'Özge', 'Şeyma', 'Büşra', 'Dilara',
];

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    // Ustalar (pro_profiles kaydı olan) + iki-mod demo hesabı.
    const ustas = await prisma.$executeRaw`
      UPDATE users u SET "avatarUrl" =
        '/seed-assets/avatars/ustas/usta-'
        || CASE WHEN u."firstName" = ANY(${FEMALE_FIRST})
                THEN 'f-' || to_char(((hashtext(u."providerSub") % 18) + 18) % 18 + 1, 'FM00')
                ELSE 'm-' || to_char(((hashtext(u."providerSub") % 40) + 40) % 40 + 1, 'FM00')
           END
        || '.jpg'
      WHERE EXISTS (SELECT 1 FROM pro_profiles p WHERE p."userId" = u.id)
         OR u."providerSub" = 'demo-kullanici'`;
    // Müşteriler / yorumcular / ödeme / gelen iş / admin.
    const users = await prisma.$executeRaw`
      UPDATE users SET "avatarUrl" =
        '/seed-assets/avatars/users/user-'
        || CASE WHEN "firstName" = ANY(${FEMALE_FIRST})
                THEN 'f-' || to_char(((hashtext("providerSub") % 17) + 17) % 17 + 1, 'FM00')
                ELSE 'm-' || to_char(((hashtext("providerSub") % 20) + 20) % 20 + 1, 'FM00')
           END
        || '.jpg'
      WHERE "providerSub" LIKE 'demo-musteri-%'
         OR "providerSub" LIKE 'demo-yorumcu-%'
         OR "providerSub" LIKE 'demo-odeme-%'
         OR "providerSub" LIKE 'demo-kullanici-isi-%'
         OR "providerSub" = 'demo-admin'`;
    console.log(`Avatar backfill: ustas=${ustas} users=${users}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Avatar backfill başarısız:', e);
  process.exit(1);
});
