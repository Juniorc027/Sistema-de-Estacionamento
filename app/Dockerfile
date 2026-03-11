# ============================================================
#  Frontend Dockerfile — Next.js 14 (multi-stage)
#  Context: ./app  (docker-compose build context)
# ============================================================

# ── Stage 1: Dependencies ──────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copiar manifesto (cache de install)
COPY package.json package-lock.json* ./

RUN npm ci --prefer-offline --legacy-peer-deps

# ── Stage 2: Build ──────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis de build (baked no bundle do Next.js)
ARG NEXT_PUBLIC_API_URL=http://localhost:5167
ARG NEXT_PUBLIC_SIGNALR_URL=http://localhost:5167/hubs/parking
ARG CACHEBUST=1

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SIGNALR_URL=$NEXT_PUBLIC_SIGNALR_URL

RUN npm run build

# ── Stage 3: Runtime ────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.js ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

CMD ["npm", "run", "start"]
