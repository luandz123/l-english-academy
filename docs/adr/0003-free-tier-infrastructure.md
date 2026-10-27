# ADR 0003: Hạ tầng free-tier: Render + Neon + Cloudflare R2 + Vercel

- **Trạng thái**: Đã chấp thuận
- **Ngày**: 2026-10-25
- **Người quyết định**: Chủ dự án (DECISIONS D-10 → D-13, C-02, C-03)
- **Tài liệu tham chiếu**: [DECISIONS.md](../DECISIONS.md)

---

## 1. Bối Cảnh
Một người làm, ngân sách 0đ/tháng, chưa có domain, người dùng ở Việt Nam, thanh toán SePay thật cần webhook luôn nhận được. Số liệu đo ngày 2026-10-25: DB Supabase 62 MB (28 bảng), storage bucket `materials` 18 MB / 13 file.

## 2. Quyết Định
| Thành phần | Production/staging | Dev (`docker-compose.yml`) |
|---|---|---|
| Frontend | Vercel (đã có), rewrite `/api/*` → backend | Vite `:8082` |
| Backend | Render free, Singapore, build từ `Dockerfile`; UptimeRobot gọi `/api/health` ~10 phút/lần | `npm run start:dev` `:3000` |
| Database | Neon free, Singapore, Postgres 18 — project `royal-water-29084351`, branch `production`. App dùng `DATABASE_URL` (pooled), Prisma CLI dùng `DATABASE_URL_UNPOOLED` | `postgres:18-alpine` `:5433` (test: Testcontainers cùng image) |
| Object storage | Cloudflare R2 (S3 API) | SeaweedFS `chrislusf/seaweedfs:4.48` `:8333` |
| Email | **Gmail API qua HTTPS** (`MAIL_PROVIDER=gmail_api`) — Render free chặn SMTP | Mailpit SMTP `:1025`, UI `:8025` |
| Giám sát | Sentry free, UptimeRobot | — |
| Backup | `pg_dump` hằng đêm (GitHub Actions) → R2, giữ 14 ngày | — |

**Thay đổi trong phiên 1**: dev dùng SeaweedFS thay MinIO vì MinIO đã ngừng phát hành Docker image (repo community archive 04/2026; `minio/minio` không còn kéo được từ Docker Hub, quay.io yêu cầu đăng nhập). R2 ở production không đổi; code chỉ dùng API S3 chung.

**Neon (2026-10-26)**: liên kết bằng `neon init` (file `neon.ts` ở root, `.neon` git-ignored); `neon deploy` ghi `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH` vào `.env` root. Migration baseline đã áp lên branch `production`. Dev/test nâng từ Postgres 16 lên 18 để cùng major với Neon (Supabase cũ là 17).

**Staging (2026-10-27)**: `backend/Dockerfile` multi-stage (~526MB, user `node`, tini). Migration **không** chạy lúc khởi động container mà ở job `deploy-staging` trong CI (migration lỗi → không deploy; image không cần Prisma CLI ~240MB). `render.yaml` khai báo service (`autoDeploy: false`). `workflow_run` và `schedule` chỉ kích hoạt với file trên nhánh mặc định nên deploy được đặt làm job trong `ci.yml`. Backup hằng đêm **chưa bật**: repo public, không lưu dump thô ở artifact (OPEN_QUESTIONS #17). Hướng dẫn: `docs/STAGING.md`.

## 3. Hệ Quả
- **Tích cực**: 0đ/tháng; mọi thành phần thay được bằng bản trả phí/VPS mà không sửa code (qua biến môi trường, đã Docker hóa). 62 MB nằm thoải mái trong 0,5 GB của Neon free.
- **Đánh đổi**:
  - Render free tắt sau 15 phút không có request, cold start ~1 phút → phụ thuộc UptimeRobot; SePay retry webhook bù cho lần đầu lỡ.
  - Không có domain → cookie đi qua rewrite Vercel; Socket.IO kết nối thẳng onrender.com; SSE qua rewrite chưa kiểm chứng (O-01).
  - Vercel Hobby không cho phép thương mại → phải chuyển khi có doanh thu (O-02).

## 4. Các Phương Án Đã Loại Bỏ
1. **VPS (~€5,5/tháng)**: luôn chạy, không giới hạn WebSocket, nhưng vượt ngân sách 0đ.
2. **Postgres free của Render**: hết hạn sau 30 ngày.
3. **Giữ Supabase làm Postgres**: tạm dừng sau 1 tuần không hoạt động, không backup, nhiều bảng dính FK vào `auth.users`.
4. **Resend**: không có domain thì chỉ gửi được tới chính chủ tài khoản.
5. **Garage / RustFS cho S3 dev**: Garage cần bước cấu hình layout; RustFS còn mới. SeaweedFS chạy một lệnh, phát hành đều.
