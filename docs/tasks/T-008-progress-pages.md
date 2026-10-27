# T-008: Tiến độ học ở Dashboard, Khóa của tôi, Hồ sơ qua API

> **Người làm**: Antigravity · **Module**: Learning (frontend) · **Nhánh**: `task/T-008-progress-pages` (tách từ `refactor/nestjs-backend` **sau khi T-007 đã merge và `git pull`**)
> **Phụ thuộc**: T-006 (endpoint `GET /learning/progress`), T-007 (adapter `src/lib/api/learning.ts`) · **Ước lượng**: 1,5 giờ
> Đọc trước: `AGENTS.md`, `T-006-learning-user-data.md` (mục 4), `T-007-learnpage-adapter.md` (mục 4), `docs/OPEN_QUESTIONS.md` #19, file này. Gặp gì không rõ: **dừng và ghi vào mục 8**.

## 0. Bắt đầu
```bash
git fetch && git checkout refactor/nestjs-backend && git pull
git checkout -b task/T-008-progress-pages
```

## 1. Mục tiêu
Thay 3 truy vấn `user_lesson_progress` ở `DashboardPage`, `MyCoursesPage`, `Profile` bằng adapter gọi `GET /api/v1/learning/progress`. Đây là **đổi hành vi có chủ đích** đã duyệt (OPEN_QUESTIONS #19): code cũ luôn nhận `[]` vì chọn/sắp theo cột không tồn tại; code mới trả dữ liệu thật.

**Không** có backend mới: endpoint đã có từ T-006 và đã sắp `last_watched_at desc nulls last, id desc`.

## 2. Phạm vi
**Được sửa/tạo**
- `src/lib/api/learning.ts` — **thêm** 1 hàm (mục 4), không đổi hàm của T-007
- `src/lib/api/learning.test.ts` — thêm test cho hàm đó
- `src/pages/DashboardPage.tsx`, `src/pages/MyCoursesPage.tsx`, `src/pages/Profile.tsx` — **chỉ** thân `queryFn` của query tiến độ (mục 3) và dòng `import`

**Cấm sửa**: JSX, `className`, câu chữ, `queryKey`, `enabled`, các `useMemo` dùng dữ liệu tiến độ; mọi truy vấn khác trong 3 trang (enrollments, modules, quiz/full test results — thuộc task khác, kể cả lỗi `duration_minutes` của #12); backend; module khác.

## 3. Hành vi cũ → mới
| PARITY | Chỗ cũ | Truy vấn cũ | Kết quả cũ trên production | Thay bằng |
|---|---|---|---|---|
| LRN-015 | `DashboardPage.tsx:92-103` | `select *` · `user_id = me` · order `created_at` desc | Lỗi (cột không có) → `data = null` → `[]` | `listMyProgressRows()` |
| LRN-016 | `MyCoursesPage.tsx:116-127` | `select lesson_id, is_completed, completed_at, updated_at, created_at` | Lỗi → `[]` | `listMyProgressRows()` |
| LRN-017 | `Profile.tsx:258-273` | như Dashboard | Lỗi → `[]` | `listMyProgressRows()` |

Thân `queryFn` mới (giữ `if (!user) return [];`, **không** ném lỗi vì code cũ cũng không ném):
```ts
if (!user) return [];
const { data } = await listMyProgressRows();
return data || [];
```
Không còn `.eq("user_id", user.id)` — server lấy từ token.

## 4. Adapter
Thêm vào `src/lib/api/learning.ts`:

```ts
/** Dòng tiến độ cho Dashboard/MyCourses/Profile (OPEN_QUESTIONS #19). */
export interface LegacyProgressRow extends LessonProgressRow { // kiểu dòng mà listMyProgress() của T-007 trả; đổi tên cho khớp nếu T-007 đặt khác
  created_at: null;
  completed_at: null;
  updated_at: null;
}
export async function listMyProgressRows(): Promise<{ data: LegacyProgressRow[] | null; error: ApiError | null }>
```
- Gọi lại `listMyProgress()` của T-007 rồi map từng dòng thành `{ ...row, created_at: null, completed_at: null, updated_at: null }`. Lỗi → trả nguyên `{ data: null, error }`.
- Lý do phải có 3 khóa `null` (không được bỏ): 3 trang đọc `p.created_at` / `p.completed_at`. Thiếu khóa → `undefined` → `new Date(undefined)` là `Invalid Date` (NaN) làm hỏng phép sắp ở `MyCoursesPage.tsx:201-212`; có khóa `null` → `new Date(null)` = 0, sắp ổn định. Chủ dự án đã quyết "trường không tồn tại để null".
- Giữ thứ tự server trả, không sắp lại ở client.

## 5. Hệ quả đã biết (ghi đúng vào mục 7, **không tự sửa**)
Với `created_at`/`completed_at` luôn `null`:
- Dashboard: số bài hoàn thành, % khóa, "bài tiếp theo" (`:160-180`) **bắt đầu có dữ liệu**. Ô "đã học" trong tuần (`:389`) vẫn không tính bài học (chỉ quiz/full test).
- Profile: bản đồ nhiệt (`:414`) vẫn bỏ qua tiến độ bài học (`if (p.created_at)`).
- MyCourses: n/N, %, trạng thái, bài tiếp theo **bắt đầu có dữ liệu**. Khi sắp "Gần đây", khóa có tiến độ nhận `lastActivityTime = 0` (`:209`) nên đứng **sau** khóa cùng trạng thái chưa học (khóa `in_progress` vẫn lên đầu nhờ `:263`).

## 6. Tiêu chí nghiệm thu
- [ ] `grep -n "user_lesson_progress" src/pages/DashboardPage.tsx src/pages/MyCoursesPage.tsx src/pages/Profile.tsx` không còn kết quả (dán output)
- [ ] `learning.test.ts`: `listMyProgressRows` gọi GET `learning/progress`; mỗi dòng có đủ 3 khóa `null` và giữ các trường gốc; giữ thứ tự; lỗi 401/500 trả `{ data: null, error }`, không ném
- [ ] `node scripts/check-ui-diff.mjs refactor/nestjs-backend` OK; `git diff refactor/nestjs-backend -- src/pages` chỉ đổi dòng `import` và thân 3 `queryFn`
- [ ] Số `queryKey` mỗi trang trước/sau bằng nhau
- [ ] Chạy tay local (backend + `npm run dev`, tài khoản test trong `.env`), đánh dấu hoàn thành 2 bài khóa 1 ở `LearnPage` rồi kiểm, ghi kết quả vào mục 7:
  - [ ] Dashboard: % khóa và bài tiếp theo đổi theo 2 bài đã hoàn thành
  - [ ] Khóa của tôi: khóa 1 hiện 2/N, bài tiếp theo là bài chưa hoàn thành đầu tiên
  - [ ] Hồ sơ: trang mở bình thường, không lỗi console
  - [ ] Đăng xuất: 3 trang không gọi `learning/progress` (do `enabled: !!user`)

## 7. Lệnh kiểm tra — dán **nguyên văn** output vào mục 8
```bash
npx eslint src/lib/api/learning.ts src/lib/api/learning.test.ts src/pages/DashboardPage.tsx src/pages/MyCoursesPage.tsx src/pages/Profile.tsx
npm test && npm run build
node scripts/check-ui-diff.mjs refactor/nestjs-backend
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```
Cập nhật `docs/PARITY.md`: chuyển 3 dòng LRN-015..017 sang `frontend ✓`, điền cột file mới + test. Cập nhật `docs/PROGRESS.md` dòng Module 3.

## 8. Kết quả (người làm điền)

## 9. Câu hỏi (người làm điền khi bị chặn)

## 10. Review (Claude điền)
