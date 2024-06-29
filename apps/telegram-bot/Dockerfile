FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app


FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY . .

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run -F telegram-bot build

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

COPY --from=builder --chown=hono:nodejs ./node_modules /app/node_modules
COPY --from=builder --chown=hono:nodejs ./apps/telegram-bot/dist /app/dist
COPY --from=builder --chown=hono:nodejs ./package.json /app/package.json

USER hono
EXPOSE 8787

CMD ["node", "/app/dist/index.js"]
