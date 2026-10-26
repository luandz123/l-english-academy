# Image production cho Render (ADR 0003). Build: docker build -t lenglish-api backend/

# --- Build: cài đủ dependency, sinh Prisma Client, biên dịch TypeScript ---
FROM node:22-alpine AS build
WORKDIR /app

# Copy schema trước npm ci: postinstall chạy `prisma generate`
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# --- Dependency production riêng ---
# @prisma/client khai báo prisma + typescript là peer dependency nên npm vẫn cài cả Prisma CLI
# (kèm Studio, engines ~240MB). Lúc chạy chỉ cần runtime của client (Prisma Client đã được
# biên dịch vào dist/generated) → xóa các gói chỉ CLI dùng. Smoke test container sau khi đổi.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts \
 && rm -rf node_modules/prisma node_modules/typescript node_modules/@prisma/studio-core \
      node_modules/@prisma/dev node_modules/@prisma/engines node_modules/effect node_modules/@electric-sql

# --- Runtime: chỉ dependency production, chạy bằng user không phải root ---
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache tini

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./

USER node
EXPOSE 3000

# tini chuyển SIGTERM tới node để Nest đóng kết nối DB gọn gàng khi Render dừng container.
# Migration KHÔNG chạy ở đây: workflow deploy-staging chạy `prisma migrate deploy` trước khi
# gọi Render Deploy Hook (migration lỗi thì không deploy; image không cần Prisma CLI ~200MB).
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
