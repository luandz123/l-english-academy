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
# @prisma/client khai báo prisma là peer dependency nên npm cài cả Prisma CLI. Giữ nguyên toàn bộ
# vì container chạy `prisma migrate deploy` lúc khởi động (CLI require tĩnh cả Studio, xóa là hỏng).
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts  && test -x node_modules/.bin/prisma

# --- Runtime: chỉ dependency production, chạy bằng user không phải root ---
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache tini

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json /app/prisma.config.ts ./
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --chown=node:node docker-entrypoint.sh ./

USER node
EXPOSE 3000

# tini chuyển SIGTERM tới node để Nest đóng kết nối DB gọn gàng khi Render dừng container.
# docker-entrypoint.sh áp migration rồi mới chạy app. Migration lỗi → container thoát, Render
# đánh dấu deploy thất bại và giữ bản đang chạy. Deploy không còn phụ thuộc GitHub Actions.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "docker-entrypoint.sh"]
