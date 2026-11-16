# Repo kökünden derlenir: docker build -f api/Dockerfile .
# Tek imaj: API + derlenmiş ön yüz (STATIC_DIR). nginx her isteği bu konteynere iletir.

# 1) Ön yüzü derle (geliştirme bağımlılıklarıyla).
FROM node:24-bookworm-slim AS web
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY api/package.json api/
COPY scraper/package.json scraper/
COPY web/package.json web/
RUN npm ci
COPY shared ./shared
COPY web ./web
RUN npm run build -w web

# 2) API ve scraper'ın yalnızca üretim bağımlılıkları.
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY api/package.json api/
COPY scraper/package.json scraper/
COPY web/package.json web/
RUN npm ci --workspace api --workspace scraper --include-workspace-root=false --omit=dev

# 3) Çalışma imajı.
FROM node:24-bookworm-slim
ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=3300 \
    STATIC_DIR=/app/web/dist
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY shared ./shared
COPY api/package.json api/drizzle.config.ts ./api/
COPY api/src ./api/src
COPY api/drizzle ./api/drizzle
COPY scraper/package.json ./scraper/
COPY scraper/src ./scraper/src
COPY --from=web /app/web/dist ./web/dist
USER node
EXPOSE 3300
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3300/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
WORKDIR /app/api
CMD ["node", "--import", "tsx", "src/index.ts"]
