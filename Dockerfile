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
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
# node_modules'ı builder'dan al (prisma CLI + generate edilmiş client dahil).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY package*.json ./
# Yüklenen görseller ephemeral disk'te (Koyeb free) — demo için kabul.
RUN mkdir -p uploads
# Koyeb PORT'u env ile verir; main.ts process.env.PORT'u okur.
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
