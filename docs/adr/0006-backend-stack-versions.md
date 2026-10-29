# ADR 0006: NestJS 11 (CommonJS) + Prisma 7 + Jest + Testcontainers 11

- **Trạng thái**: Đã chấp thuận
- **Ngày**: 2026-10-25
- **Người quyết định**: Claude (phiên 1), cần chủ dự án xác nhận
- **Tài liệu tham chiếu**: `backend/package.json`, `backend/prisma/schema.prisma`

---

## 1. Bối Cảnh
Lúc dựng khung (2026-10-25): NestJS mới nhất là 12.x (chuyển sang ESM, `@nestjs/cli@12` lỗi `ERR_REQUIRE_CYCLE_MODULE` trên Node 22.14 của máy dev). Tag `latest` của Prisma trỏ vào bản RC 8.0.0; bản ổn định là 7.10.x. Testcontainers 12 yêu cầu Node ≥ 22.22.

## 2. Quyết Định
- **NestJS 11** (CommonJS), TypeScript `strict`. Ổn định, tài liệu và ví dụ nhiều nhất, Jest chạy không vướng ESM.
- **Prisma 7.10** (bản ổn định), generator `prisma-client` (`moduleFormat = "cjs"`, `importFileExtension = ""`), driver adapter `@prisma/adapter-pg`. Client sinh vào `src/generated/prisma` (git-ignored, sinh lại qua `postinstall`).
  - Prisma 7 nạp query compiler bằng dynamic `import()` → Jest chạy với `node --experimental-vm-modules`.
- **Schema**: model PascalCase/field camelCase, `@map` giữ nguyên tên bảng/cột cũ; API vẫn trả snake_case qua mapper (luật 2 AGENTS.md).
- **Test**: Jest + supertest; e2e dùng Postgres thật bằng **Testcontainers 11** (hỗ trợ Node 22.14), một container cho cả lượt chạy (`test/setup/global-setup.ts`).
- **Logger**: `nestjs-pino` (JSON trên production, ẩn header `authorization`/`cookie`).
- **Config**: `@nestjs/config` + zod, thiếu biến → app từ chối khởi động.

## 3. Hệ Quả
- **Tích cực**: chọn bản ổn định, ít rủi ro; mọi thứ chạy được trên máy dev hiện tại và CI.
- **Đánh đổi**: sẽ phải nâng lên NestJS 12/ESM về sau (không gấp, Nest 11 còn được hỗ trợ). Cờ `--experimental-vm-modules` in cảnh báo khi chạy test.
- **Khuyến nghị**: nâng Node trên máy dev lên bản 22 LTS mới nhất (≥ 22.22) — `neon` CLI cũng yêu cầu ≥ 22.20 cho phần skills.

## 4. Các Phương Án Đã Loại Bỏ
1. **NestJS 12 (ESM)**: mới 2 tháng, CLI lỗi trên máy dev, Jest + ESM cần cấu hình thêm.
2. **Prisma 8 RC**: chưa ổn định.
3. **TypeORM**: HLD đã chọn Prisma; Prisma có schema rõ và migration dễ review.
4. **Vitest cho backend**: Nest CLI và tài liệu mặc định là Jest; giữ thống nhất với hệ sinh thái Nest.
