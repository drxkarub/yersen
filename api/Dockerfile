# Repo kökünden derlenir: docker build -f api/Dockerfile .
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY api/package.json api/
COPY scraper/package.json scraper/
COPY web/package.json web/
RUN npm ci --workspace api --include-workspace-root=false --omit=dev

FROM node:24-bookworm-slim
ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=3300
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY shared ./shared
COPY api/package.json api/drizzle.config.ts ./api/
COPY api/src ./api/src
COPY api/drizzle ./api/drizzle
USER node
EXPOSE 3300
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3300/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
WORKDIR /app/api
CMD ["node", "--import", "tsx", "src/index.ts"]
