# İŞTE Backend

NestJS 11 + Prisma 7 + PostgreSQL 16/PostGIS REST API'si. Ürün kuralları için kök dizindeki [CLAUDE.md](../CLAUDE.md) ve [docs/urun-anayasasi.md](../docs/urun-anayasasi.md) bağlayıcıdır.

## Çalıştırma

```bash
docker compose up -d           # kökten: DB'yi başlat
npm install
npx prisma migrate dev         # şemayı uygula
npm run start:dev              # http://localhost:3000/api/v1
```

## Test

```bash
npm test          # unit
npm run test:e2e  # gerçek DB'ye karşı uçtan uca
npm run lint
```

## Yapı

- `src/<modül>/` — controller + service + dto; iş mantığı service'te
- `src/prisma/` — global PrismaService (driver adapter: pg)
- `prisma/schema.prisma` — şema; migration'lar `prisma/migrations/`
- `uploads/` — kullanıcı görselleri (sunucu diski; repo dışı)
