FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build --workspace apps/api

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/knexfile.js ./knexfile.js
COPY --from=builder /app/apps/api/migrations ./migrations
# Скриншоты инструкций из поставки: сервис отдаёт их из assets/guides
COPY --from=builder /app/apps/api/assets ./assets
COPY --from=builder /app/apps/api/seeds ./seeds

CMD ["node", "dist/main.js"]
