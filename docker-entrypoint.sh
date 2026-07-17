#!/bin/sh
# Render/Docker başlangıcı: migrate → (DB boşsa) seed → uygulama.
# Seed Render'ın İÇİNDEN çalışır: iç ağ (SSL yok) + demo görselleri container'a
# yazılır. "Boşsa seed" sayesinde sonraki uyanışlar hızlıdır (yeniden seed yok).
set -e

npx prisma migrate deploy

COUNT=$(node -e "const{PrismaPg}=require('@prisma/adapter-pg');const{PrismaClient}=require('./generated/prisma/client');const p=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});p.proProfile.count().then(c=>{process.stdout.write(String(c));return p.\$disconnect()}).catch(()=>process.stdout.write('0'))" 2>/dev/null || echo 0)
echo "== Usta sayısı: $COUNT =="

export TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node","resolvePackageJsonExports":false,"customConditions":null}'

if [ "$COUNT" -lt 150 ] || [ "$FORCE_SEED" = "1" ]; then
  echo "== Demo dünyası yükleniyor (seed) =="
  npx ts-node --transpile-only prisma/seed.ts || echo "!! Seed başarısız — mevcut veriyle devam"
fi

# Avatarları her açılışta SENTETİK yüzlere + cinsiyet-eşleşmeli güncelle
# (idempotent; tam reseed atlansa bile eski/çizim avatarları düzeltir).
echo "== Avatar backfill (sentetik yüz, cinsiyet-eşleşmeli) =="
npx ts-node --transpile-only prisma/backfill-avatars.ts || echo "!! Avatar backfill başarısız — mevcut avatarlarla devam"

# Galeri + kapak: kategoriye göre gerçek iş fotoğrafları (idempotent).
echo "== Galeri + kapak backfill (gerçek iş fotoğrafları) =="
npx ts-node --transpile-only prisma/backfill-gallery.ts || echo "!! Galeri backfill başarısız — mevcut galeriyle devam"

exec node dist/src/main
