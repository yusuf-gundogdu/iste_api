#!/bin/sh
# Render/Docker başlangıcı: migrate → (DB boşsa) seed → uygulama.
# Seed Render'ın İÇİNDEN çalışır: iç ağ (SSL yok) + demo görselleri container'a
# yazılır. "Boşsa seed" sayesinde sonraki uyanışlar hızlıdır (yeniden seed yok).
set -e

npx prisma migrate deploy

COUNT=$(node -e "const{PrismaPg}=require('@prisma/adapter-pg');const{PrismaClient}=require('./generated/prisma/client');const p=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});p.category.count().then(c=>{process.stdout.write(String(c));return p.\$disconnect()}).catch(()=>process.stdout.write('0'))" 2>/dev/null || echo 0)
echo "== Kategori sayısı: $COUNT =="

if [ "$COUNT" = "0" ]; then
  echo "== İlk kurulum: demo veri yükleniyor (seed) =="
  export TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node","resolvePackageJsonExports":false,"customConditions":null}'
  npx ts-node --transpile-only prisma/seed.ts || echo "!! Seed başarısız — boş DB ile devam"
fi

exec node dist/src/main
