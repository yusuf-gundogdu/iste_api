# İŞTE backend (NestJS + Prisma + PostGIS) — Koyeb/Docker dağıtımı.
# Çok aşamalı: builder derler, runner yalın çalıştırır.
# Başlangıçta `prisma migrate deploy` (PostGIS init migration'da) sonra app.

# ─── Builder ───────────────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app
# Prisma sorgu motoru OpenSSL ister (debian-slim'de kurulur).
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# ─── Runner ────────────────────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app
# NOT: NODE_ENV production YAPILMIYOR — arkadaş testi DEMO giriş (dev auth)
# kullanır; production'da dev auth güvenlik gereği kapalı (gerçek OAuth ister).
# Bu backend demo/test amaçlıdır, gerçek kullanıcı için değildir.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
# node_modules'ı builder'dan al (prisma CLI + generate edilmiş client dahil).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY package*.json ./
# Yüklenen görseller ephemeral disk'te (free tier) — demo için kabul.
RUN mkdir -p uploads
# PORT env ile gelir; main.ts process.env.PORT'u okur.
EXPOSE 3000
# migrate → (boşsa) seed → uygulama.
CMD ["sh", "docker-entrypoint.sh"]
