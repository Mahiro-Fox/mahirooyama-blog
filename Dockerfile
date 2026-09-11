FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# AI Agent 工具执行器：/api/chat 通过 execFileSync 调用 Python 计算工具
# alpine 中 Python 可执行名为 python3（无 python 别名），故显式指定 AGENT_PYTHON
RUN apk add --no-cache python3
ENV AGENT_PYTHON=python3
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# 工具执行脚本（纯标准库，不参与 .next 打包，需手动拷入镜像运行目录）
COPY ai-tools ./ai-tools
EXPOSE 3000
CMD ["node", "server.js"]
