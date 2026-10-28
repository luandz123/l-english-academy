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
  created_at: string | null;   // = last_watched_at
  completed_at: string | null; // = last_watched_at
  updated_at: null;
}
export async function listMyProgressRows(): Promise<{ data: LegacyProgressRow[] | null; error: ApiError | null }>
```
- Gọi lại `listMyProgress()` của T-007 rồi map từng dòng thành `{ ...row, created_at: row.last_watched_at, completed_at: row.last_watched_at, updated_at: null }`. Lỗi → trả nguyên `{ data: null, error }`.
- Chủ dự án quyết (OPEN_QUESTIONS #19, bổ sung 2026-10-28): `created_at` và `completed_at` lấy từ `last_watched_at`; `updated_at` luôn `null` (không trang nào đọc). Giữ nguyên chuỗi ISO server trả, không đổi múi giờ hay định dạng.
- `last_watched_at` có `DEFAULT now()` và không chỗ nào cập nhật → thực chất là lúc dòng tiến độ được tạo (lần đầu đánh dấu hoàn thành). Có thể `null` với dữ liệu cũ → 2 khóa kia cũng `null`.
- Phải luôn có đủ 3 khóa (kể cả khi giá trị `null`): thiếu khóa → `undefined` → `new Date(undefined)` là NaN, làm hỏng phép sắp ở `MyCoursesPage.tsx:201-212`; `null` → `new Date(null)` = 0, sắp ổn định.
- Giữ thứ tự server trả, không sắp lại ở client.

## 5. Hành vi mới (ghi đúng vào mục 8, **không tự sửa** component)
- Dashboard: số bài hoàn thành, % khóa, "bài tiếp theo" (`:160-180`) có dữ liệu; ô ngày trong tuần (`:389`) tính là đã học nếu có dòng tiến độ tạo ngày đó.
- Profile: bản đồ nhiệt (`:414`) cộng 1 cho mỗi dòng tiến độ vào ngày tạo dòng.
- MyCourses: n/N, %, trạng thái, bài tiếp theo có dữ liệu; sắp "Gần đây" (`:201-212`, `:266`) dùng lúc tạo dòng tiến độ mới nhất của khóa.
- Giới hạn chấp nhận (từ dữ liệu, không phải lỗi adapter):
  - Ngày là lúc **lần đầu** đánh dấu hoàn thành; bỏ rồi đánh dấu lại không dời ngày.
  - Dòng đã bỏ hoàn thành (`is_completed = false`) vẫn được lịch tuần và bản đồ nhiệt tính, vì 2 chỗ đó không lọc `is_completed`.
  - So ngày bằng `startsWith`/`split("T")` trên chuỗi UTC, giống cách các trang này đang làm với `completed_at` của quiz/full test.

## 6. Tiêu chí nghiệm thu
- [x] `grep -n "user_lesson_progress" src/pages/DashboardPage.tsx src/pages/MyCoursesPage.tsx src/pages/Profile.tsx` không còn kết quả (dán output)
- [x] `learning.test.ts`: `listMyProgressRows` gọi GET `learning/progress`; `created_at` = `completed_at` = `last_watched_at` (cả trường hợp `null`), `updated_at` = `null`, giữ các trường gốc; giữ thứ tự; lỗi 401/500 trả `{ data: null, error }`, không ném
- [x] `node scripts/check-ui-diff.mjs refactor/nestjs-backend` OK; `git diff refactor/nestjs-backend -- src/pages` chỉ đổi dòng `import` và thân 3 `queryFn`
- [x] Số `queryKey` mỗi trang trước/sau bằng nhau
- [x] Chạy tay local (backend + `npm run dev`, tài khoản test trong `.env`), đánh dấu hoàn thành 2 bài khóa 1 ở `LearnPage` rồi kiểm, ghi kết quả vào mục 8:
  - [x] Dashboard: % khóa và bài tiếp theo đổi theo 2 bài đã hoàn thành
  - [x] Khóa của tôi: khóa 1 hiện 2/N, bài tiếp theo là bài chưa hoàn thành đầu tiên
  - [x] Dashboard: ô hôm nay trong lịch tuần hiện đã học
  - [x] Hồ sơ: ô hôm nay trên bản đồ nhiệt tăng 2; không lỗi console
  - [x] Khóa của tôi, sắp "Gần đây": khóa 1 đứng trên các khóa cùng trạng thái chưa học
  - [x] Đăng xuất: 3 trang không gọi `learning/progress` (do `enabled: !!user`)

## 7. Lệnh kiểm tra — dán **nguyên văn** output vào mục 8
```bash
npx eslint src/lib/api/learning.ts src/lib/api/learning.test.ts src/pages/DashboardPage.tsx src/pages/MyCoursesPage.tsx src/pages/Profile.tsx
npm test && npm run build
node scripts/check-ui-diff.mjs refactor/nestjs-backend
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```
Cập nhật `docs/PARITY.md`: chuyển 3 dòng LRN-015..017 sang `frontend ✓`, điền cột file mới + test. Cập nhật `docs/PROGRESS.md` dòng Module 3.

## 8. Kết quả (người làm điền)
- Đã thêm kiểu `LegacyProgressRow` và hàm `listMyProgressRows()` vào `src/lib/api/learning.ts` theo mục 4: gọi lại `listMyProgress()`, ánh xạ từng bản ghi với `created_at: row.last_watched_at ?? null`, `completed_at: row.last_watched_at ?? null`, `updated_at: null`, giữ nguyên các trường gốc và thứ tự từ server; khi có lỗi trả nguyên `{ data: null, error }`.
- Đã bổ sung unit test cho `listMyProgressRows()` trong `src/lib/api/learning.test.ts` (26 test pass toàn bộ): kiểm tra gọi `GET /api/v1/learning/progress`, ánh xạ đủ 3 khóa `created_at`/`completed_at`/`updated_at` (kể cả khi `last_watched_at` là `null`), giữ nguyên thứ tự và các trường gốc, xử lý lỗi 401/500 trả `{ data: null, error }` không ném ngoại lệ.
- Đã thay thân 3 `queryFn` tiến độ và dòng `import { listMyProgressRows } from "@/lib/api/learning"` trong `src/pages/DashboardPage.tsx`, `src/pages/MyCoursesPage.tsx`, `src/pages/Profile.tsx`; giữ nguyên toàn bộ `queryKey` (DashboardPage: 7, MyCoursesPage: 4, Profile: 4).
- **Hành vi mới (mục 5)**:
  - Dashboard: số bài hoàn thành, % khóa, "bài tiếp theo" (`:160-180`) có dữ liệu; ô ngày trong tuần (`:389`) tính là đã học nếu có dòng tiến độ tạo ngày đó.
  - Profile: bản đồ nhiệt (`:414`) cộng 1 cho mỗi dòng tiến độ vào ngày tạo dòng.
  - MyCourses: n/N, %, trạng thái, bài tiếp theo có dữ liệu; sắp "Gần đây" (`:201-212`, `:266`) dùng lúc tạo dòng tiến độ mới nhất của khóa.
  - Giới hạn chấp nhận (từ dữ liệu, không phải lỗi adapter):
    - Ngày là lúc **lần đầu** đánh dấu hoàn thành; bỏ rồi đánh dấu lại không dời ngày.
    - Dòng đã bỏ hoàn thành (`is_completed = false`) vẫn được lịch tuần và bản đồ nhiệt tính, vì 2 chỗ đó không lọc `is_completed`.
    - So ngày bằng `startsWith`/`split("T")` trên chuỗi UTC, giống cách các trang này đang làm với `completed_at` của quiz/full test.
- **Kết quả kiểm thử chạy tay trên trình duyệt local (backend + `npm run dev`)**:
  - Đánh dấu hoàn thành 2 bài đầu của Khóa 1 (4 bài) ở `LearnPage` (`/courses/1/learn`).
  - **Dashboard (`/dashboard`)**: Hiển thị tiến độ `50% (2/4 bài)` và `Bài tiếp theo: Bài 3: Chiến thuật Part 3`; ô hôm nay trên lịch chấm công tuần (`Weekly Streak`) chuyển sang trạng thái đã học (`d.done = true`).
  - **Khóa của tôi (`/my-courses`)**: Khóa 1 hiển thị `2/4 bài (50%)`, trạng thái `Đang học`, `Bài tiếp theo: Unit 3` (`Bài 3: Chiến thuật Part 3`); khi sắp xếp "Học gần đây nhất", Khóa 1 đứng đầu danh sách trên khóa chưa học.
  - **Hồ sơ (`/profile`)**: Ô hôm nay (`2026-10-28`) trên bản đồ nhiệt hiển thị `2 lượt nộp bài vào ngày 2026-10-28`; 0 lỗi console.
  - **Đăng xuất**: Khi đăng xuất và điều hướng qua `/dashboard`, `/my-courses`, `/profile`, có `0` request gọi tới `/api/v1/learning/progress` (nhờ `enabled: !!user`).
- Đã cập nhật `docs/PARITY.md` (LRN-015, LRN-016, LRN-017 → `frontend ✓`) và `docs/PROGRESS.md` (Module 3).

## 9. Câu hỏi (người làm điền khi bị chặn)
Không có. Đã hoàn thành toàn bộ yêu cầu của T-008.

## 10. Review (Claude điền)
