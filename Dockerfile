FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Build
FROM base AS builder
ARG NEXT_PUBLIC_APP_BASE_URL
ARG NEXT_PUBLIC_FEISHU_APP_ID
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_APP_BASE_URL=$NEXT_PUBLIC_APP_BASE_URL
ENV NEXT_PUBLIC_FEISHU_APP_ID=$NEXT_PUBLIC_FEISHU_APP_ID
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

USER nextjs
EXPOSE 3015

CMD ["npx", "next", "start", "--port", "3015"]
