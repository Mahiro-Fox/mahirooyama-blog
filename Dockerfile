FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# build 阶段需要的 dummy 值（src/constant/auth.ts 顶层校验，缺了会 throw）
# 运行时由 docker-compose 的 environment 传入真值覆盖
# 如需用真实值 build，可通过 --build-arg 传入
ARG JWT_SECRET=dummy_build_secret_at_least_32_chars_long_for_validation_only
ARG ADMIN_DEFAULT_PASSWORD=dummy_build_password
ENV JWT_SECRET=$JWT_SECRET
ENV ADMIN_DEFAULT_PASSWORD=$ADMIN_DEFAULT_PASSWORD
RUN corepack enable && pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/uploads ./uploads
EXPOSE 3000
CMD ["node", "server.js"]
