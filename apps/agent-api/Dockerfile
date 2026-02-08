# 使用 Debian 镜像, 避免 Alpine 兼容性问题
FROM node:20-slim AS base

# 安装必要的系统依赖
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN npm install -g turbo pnpm

# Pruner 阶段 - 裁剪项目
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune --scope=agent-api --docker

# 依赖安装阶段
FROM base AS installer
WORKDIR /app

# 首先复制裁剪后的 package.json 文件
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# 安装依赖
RUN pnpm install --frozen-lockfile

# 构建阶段
FROM installer AS builder
WORKDIR /app

# 复制裁剪后的完整源码
COPY --from=pruner /app/out/full/ .

# 生成 Prisma 客户端并构建
RUN cd apps/agent-api && pnpm run db:generate
RUN turbo run build --filter=agent-api

# 生产阶段
FROM node:20-slim AS production
WORKDIR /app

# 生产环境也需要 OpenSSL
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

# 复制必要文件
COPY --from=pruner /app/out/json/package.json ./
COPY --from=pruner /app/out/json/pnpm-lock.yaml ./
COPY --from=pruner /app/out/json/apps/agent-api/package.json ./apps/agent-api/

# 只安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 复制构建产物
COPY --from=builder /app/apps/agent-api/dist ./apps/agent-api/dist
COPY --from=builder /app/apps/agent-api/prisma ./apps/agent-api/prisma

# 生成 Prisma 客户端（锁定版本，避免 npx 拉取最新版）
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN cd apps/agent-api && npx prisma@5.10.2 generate
ENV DATABASE_URL=""

# 暴露端口
EXPOSE 3001

# 生产模式启动命令
CMD ["node", "apps/agent-api/dist/main"]
