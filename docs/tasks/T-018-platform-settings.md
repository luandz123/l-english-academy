# T-018: Cài đặt nền tảng (`platform_settings`) qua API

> **Người làm**: Antigravity · **Module**: Admin · **Nhánh**: `task/T-018-platform-settings`
> **Phụ thuộc**: không · **Ước lượng**: 2 giờ
> Đọc trước: `AGENTS.md`, code `backend/src/modules/admin/` (T-014, làm theo đúng mẫu), file này.

## 1. Mục tiêu
3 nơi đọc/ghi `platform_settings` thẳng Supabase: cấu hình trang chủ (giá VIP, section), gói từ vựng game, trang cài đặt admin. Chuyển sang API.

## 2. Phạm vi
**Được sửa/tạo**: `backend/src/modules/admin/**` (thêm `settings.controller.ts` cho route công khai, route admin vào controller admin, method service/repository, DTO, spec); `backend/test/platform-settings.e2e-spec.ts`; `src/lib/api/admin.ts` + `.test.ts` (thêm hàm); **chỉ** đoạn gọi Supabase trong `src/services/homepageShowcaseService.ts` (`:359-372` đọc, `:450-469` ghi), `src/services/vocabPacksService.ts` (`:29-40` đọc, `:98-125` ghi), `src/pages/admin/AdminSettings.tsx` (thân `queryFn` `admin-settings` + vòng lặp lưu trong `mutationFn`) và `import`.
**Cấm**: JSX, câu chữ, `queryKey`; logic gộp mặc định / cache `localStorage` trong 2 service (giữ nguyên, chỉ thay nguồn dữ liệu); module khác. Không đụng `PaymentsService` (đã tự đọc giá từ DB).

## 3. Hành vi cũ (RLS là nguồn sự thật)
- `Public read for non-sensitive platform settings` (`20261023_platform_settings_public_read.sql`): ai cũng đọc được **đúng** các key: `homepage_showcase_config`, `game_vocab_packs`, `platform_name`, `tagline`, `primary_color`, `accent_color`, `contact_email`, `contact_phone`.
- `Admins manage platform settings` (ALL): chỉ admin đọc mọi key và ghi.
- Ghi cũ: đọc xem key có chưa → `update` hoặc `insert` (2 lệnh rời). Mới: một upsert.

## 4. Đặc tả
| Method | Route | Guard | Body | Trả về |
|---|---|---|---|---|
| GET | `/api/v1/settings/:key` | không | — | `{ setting: SettingDto \| null }` |
| GET | `/api/v1/admin/settings` | admin | — | `SettingDto[]` order `key` |
| PUT | `/api/v1/admin/settings/:key` | admin | `{ value: string }` (`@IsString`, `@MaxLength(1_000_000)`) | `SettingDto` |

- `SettingDto`: `key, value, updated_at`.
- Route công khai: key **không** nằm trong danh sách mục 3 → `{ setting: null }` (không lộ key nhạy cảm, không báo key có tồn tại hay không). Danh sách đặt làm hằng số trong backend, có comment trỏ tới migration.
- `PUT`: `upsert` theo `key`, cập nhật `updated_at = now()`. `key`: `^[a-z0-9_]{1,64}$` → khác thì 400 `VALIDATION_FAILED`.

## 5. Thay thế ở frontend
| Chỗ cũ | Thay bằng |
|---|---|
| `homepageShowcaseService.ts:361-365` | `getPublicSetting("homepage_showcase_config")` → dùng `data?.value` y như `data?.value` cũ; lỗi → đi tiếp nhánh fallback cũ |
| `homepageShowcaseService.ts:452-469` | `const { error } = await saveSetting("homepage_showcase_config", jsonStr); if (error) throw error;` |
| `vocabPacksService.ts:31-35` | `getPublicSetting("game_vocab_packs")` |
| `vocabPacksService.ts:100-120` | `saveSetting("game_vocab_packs", …)`, giữ cách xử lý lỗi cũ của hàm |
| `AdminSettings.tsx:121` | `listAdminSettings()` → `data ?? []` rồi giữ đoạn dựng `map` |
| `AdminSettings.tsx:150-160` (vòng lặp select/update/insert) | `for (const entry of entries) await saveSetting(entry.key, entry.value);` (cũ không kiểm lỗi từng lệnh — giữ) |

Adapter trong `src/lib/api/admin.ts`: `getPublicSetting(key)` (bóc `.setting`), `listAdminSettings()`, `saveSetting(key, value)`; trả `{ data, error }`, không ném.

## 6. Tiêu chí nghiệm thu
- [ ] E2E: khách đọc được `homepage_showcase_config`; khách đọc key không công khai (vd. `secret_x` đã seed) → `{ setting: null }`; admin đọc tất cả; học viên gọi route admin → 403; không token → 401; PUT tạo mới rồi PUT lại cập nhật (1 dòng); key sai định dạng → 400
- [ ] Sau PUT `homepage_showcase_config` với giá mới, `POST /payments/orders` của user mới dùng giá đó (chứng minh cùng nguồn)
- [ ] Adapter test; `grep -rn "platform_settings" src --include=*.ts --include=*.tsx | grep -v "integrations/supabase/types.ts\|AdminBackup"` rỗng; `check-ui-diff` OK

## 7. Lệnh kiểm tra — dán **nguyên văn** output vào mục 8, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -rn "platform_settings" src --include=*.ts --include=*.tsx | grep -v "integrations/supabase/types.ts\|AdminBackup"
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 8. Kết quả (người làm điền)

## 9. Câu hỏi (người làm điền khi bị chặn)

## 10. Review (Claude điền)
