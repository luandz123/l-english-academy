# Review T-033 (Claude, 2026-10-29) — ✅ PASS (lần 2)

Review trên `97373ad`. Phần tốt: route admin guard cấp class, danh sách admin không lộ `users.password_hash`, `MyCoursesPage` giữ `[]` như cũ (#12), `WordShooterLobby` chỉ đổi phần đọc từ vựng, không đụng broadcast. Phải sửa 4 điểm rồi push lại cùng nhánh:

1. **Bảng xếp hạng thời gian học lộ dữ liệu người khác** (luật 4: mỗi RLS cũ có kiểm tra ở backend). Code cũ (`DashboardPage.tsx:310`) đọc `user_full_test_results` + `user_quiz_results` dưới RLS:
   `"Users view own results" USING (auth.uid() = user_id)` và `"Admins view all results"` (migration `20260329141747…sql:209-211, 313-315`).
   → học viên chỉ nhận **tổng của chính mình**, admin nhận tất cả, khách nhận `[]`. Endpoint mới công khai và trả `user_id` + tổng giờ của **mọi** user.
   - `GET /assessment/leaderboard/study-time` dùng `OptionalJwtAuthGuard`: khách → `[]`; học viên → một phần tử của chính mình (hoặc `[]`); admin → mọi user. Vẫn do server cộng.
   - e2e 3 vai: khách `[]`, học viên A không thấy `user_id` của B, admin thấy cả hai.
   - queryKey `["dashboard-study-leaderboard"]` → thêm `user?.id` (#21).
   - Mẫu đã có: `results/me`, `full-test-results/me`.
2. **File sao lưu đổi định dạng.** Code cũ `AdminBackup.tsx:164` xuất `supabase.from(table).select("*")` → khóa **snake_case đúng tên cột DB**. `export-full` đang trả object Prisma (camelCase: `courseType`, `createdAt`, …) → file JSON khác hẳn, không dùng lại được với bản sao lưu cũ.
   - Mỗi bảng trong danh sách cố định của code cũ: trả đúng tên cột DB (map ngược `@map`, hoặc `$queryRaw` với tên bảng là hằng số, **không** lấy từ request). Giữ thứ tự bảng, `schema_version`, cấu trúc payload như cũ.
   - Kiểu số lớn/Decimal/Date serialize giống Supabase (chuỗi ISO cho timestamp).
   - e2e: một dòng `courses` xuất ra có `course_type`, `created_at` (không có `courseType`).
3. **`gameSound.ts`: bỏ `playLevelUpSound` vừa thêm** (luật 3, ngoài phạm vi). Code cũ gọi một hàm không tồn tại → đó là hành vi hiện tại. Ghi vào mục "Câu hỏi" của spec (Claude chuyển sang OPEN_QUESTIONS), không tự sửa.
4. **e2e 3 vai cho mọi route admin mới** (BRIEFS "e2e 3 vai cho mọi route admin"): hiện chỉ `backup/stats` có 401/403. Thêm 401 (không token) + 403 (học viên) cho: `backup/export-*`, `activity-log` (GET/POST), `users/admins`, và toàn bộ `assessment/admin/vocab/*`.

Sau khi sửa: chạy lại toàn bộ lệnh kiểm tra (kể cả `tsc` cho adapter + các trang đã sửa), dán output nguyên văn **sau commit cuối**, push lại `task/T-033-leftovers`, đổi QUEUE về 🔍.

---

## Lần 2 (trên `4fad0dd`) — ✅ PASS, merged

- Leaderboard theo RLS cũ (khách `[]`, học viên chỉ mình, admin tất cả) + e2e 3 vai; queryKey thêm `user?.id` (#21 — ngoại lệ `check-ui-diff` đã duyệt).
- Backup: `SELECT *` theo danh sách bảng cố định (khớp `AdminBackup.tsx` cũ) → khóa snake_case; serialize BigInt/Decimal/Date.
- `playLevelUpSound` đã bỏ; lỗi tsc `WordShooterLobby.tsx:374` là lỗi có sẵn của code cũ (gọi hàm không tồn tại) — giữ, ghi OPEN_QUESTIONS #29.
- e2e 401/403 cho mọi route admin mới.
- **Claude sửa khi merge:** `assessment-admin.service.spec.ts` thiếu tham số `VocabMapper` (TS2554 sau khi gộp với T-028); `getMyCoursesModules` dùng `any` → `unknown[]`.
- Sót: `DashboardPage.tsx:150` (`modules` theo khóa Nghe-Đọc) không có trong brief T-033 → chuyển T-034.

Kiểm tra sau gộp (merge/T-033, sau sửa):
```
LINT_OK / TYPE_OK
Tests:       346 passed, 346 total
Tests:       427 passed, 427 total
BUILD_OK
Tests  224 passed (224)
FE_LINT_OK
tsc (adapter + trang đã sửa): chỉ WordShooterLobby.tsx:374 (lỗi có sẵn, xem trên)
✓ built in 51.72s
```
