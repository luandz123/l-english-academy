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

### Output nguyên văn các lệnh kiểm tra (mục 6 & mục 7):

```text
$ grep -n "user_lesson_progress" src/pages/DashboardPage.tsx src/pages/MyCoursesPage.tsx src/pages/Profile.tsx

$ npx eslint src/lib/api/learning.ts src/lib/api/learning.test.ts src/pages/DashboardPage.tsx src/pages/MyCoursesPage.tsx src/pages/Profile.tsx

C:\Users\lenovo\l-english-academy\src\pages\DashboardPage.tsx
   121:24  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   122:24  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   130:28  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   144:59  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   153:38  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   159:40  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   161:40  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   162:31  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   174:11  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   174:44  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   248:13  error    Empty block statement                                                                                                                                                                     no-empty
   254:34  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   298:13  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   298:47  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   320:41  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   325:43  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   335:62  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   336:58  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   358:9   warning  The 'monday' object construction makes the dependencies of useMemo Hook (at line 405) change on every render. To fix this, wrap the initialization of 'monday' in its own useMemo() Hook  react-hooks/exhaustive-deps
   375:21  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   376:34  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   379:21  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   380:34  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   386:49  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   424:49  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   425:45  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   473:48  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
   474:51  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any
  1321:39  error    Unexpected any. Specify a different type                                                                                                                                                  @typescript-eslint/no-explicit-any

C:\Users\lenovo\l-english-academy\src\pages\MyCoursesPage.tsx
   73:20  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   85:39  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   95:40  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  103:66  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  129:45  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  133:48  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  134:46  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  142:33  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  143:41  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  145:41  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  151:13  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  151:50  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  200:21  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  200:49  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  202:15  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  202:23  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  456:49  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  539:49  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

C:\Users\lenovo\l-english-academy\src\pages\Profile.tsx
   290:29  error  Unexpected any. Specify a different type             @typescript-eslint/no-explicit-any
   300:36  error  Unexpected any. Specify a different type             @typescript-eslint/no-explicit-any
   320:33  error  Unexpected any. Specify a different type             @typescript-eslint/no-explicit-any
   434:9   error  'loopDate' is never reassigned. Use 'const' instead  prefer-const
   492:29  error  Unexpected any. Specify a different type             @typescript-eslint/no-explicit-any
   500:30  error  Unexpected any. Specify a different type             @typescript-eslint/no-explicit-any
   509:33  error  Unexpected any. Specify a different type             @typescript-eslint/no-explicit-any
   517:33  error  Unexpected any. Specify a different type             @typescript-eslint/no-explicit-any
   609:19  error  Unexpected any. Specify a different type             @typescript-eslint/no-explicit-any
   643:19  error  Unexpected any. Specify a different type             @typescript-eslint/no-explicit-any
   696:19  error  Unexpected any. Specify a different type             @typescript-eslint/no-explicit-any
  1391:37  error  Unexpected any. Specify a different type             @typescript-eslint/no-explicit-any
  1454:37  error  Unexpected any. Specify a different type             @typescript-eslint/no-explicit-any

✖ 60 problems (59 errors, 1 warning)
  1 error and 0 warnings potentially fixable with the `--fix` option.


$ npm test && npm run build

> vite_react_shadcn_ts@0.0.0 test
> vitest run


 RUN  v3.2.4 C:/Users/lenovo/l-english-academy

 ✓ src/test/example.test.ts (1 test) 3ms
 ✓ src/lib/api/client.test.ts (4 tests) 13ms
 ✓ src/lib/api/catalog.test.ts (11 tests) 16ms
 ✓ src/lib/api/auth.test.ts (9 tests) 20ms
 ✓ src/lib/api/learning.test.ts (26 tests) 21ms
stdout | src/test/part2Audio.test.ts > SoundAudioPlayer playback and sequence behavior > checks what happens when speakSequence is called again during sequence pause
Played URLs when restarted in pause: [
  '/api/tts?q=Question%201',
  '/api/tts?q=Question%201',
  '/api/tts?q=(A)%20Option%20A'
]

 ✓ src/test/part2Audio.test.ts (3 tests) 397ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 17ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 15ms

 Test Files  8 passed (8)
      Tests  71 passed (71)
   Start at  15:57:05
   Duration  7.24s (transform 1.38s, setup 1.69s, collect 7.20s, tests 502ms, environment 9.73s, prepare 1.70s)


> vite_react_shadcn_ts@0.0.0 build
> vite build

vite v5.4.19 building for production...
transforming...
✓ 2733 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                        1.71 kB │ gzip:   0.80 kB
dist/assets/icon-shield-B0UUQDlh.webp                 16.16 kB
dist/assets/icon-flame-3d-DnBxg_M6.webp               28.17 kB
dist/assets/icon-arcade-3d-Bi7AXjVJ.webp              28.75 kB
dist/assets/icon-trophy-3d-CctHGkgb.webp              30.14 kB
dist/assets/icon-word-defense-BYBOe8H3.webp           35.35 kB
dist/assets/icon-dictation-3d-C0aBuE_E.webp           36.24 kB
dist/assets/icon-vip-crown-3d-8elhJVIy.webp           36.91 kB
dist/assets/icon-video-3d-mGfYA5-a.webp               39.78 kB
dist/assets/icon-fulltest-3d-DVa66wxC.webp            39.84 kB
dist/assets/icon-word-shooter-CV9wU2_M.webp           46.04 kB
dist/assets/icon-ets-seal-3d-DNcz2jN_.webp            46.88 kB
dist/assets/icon-vocab-packs-CooV73nv.webp            46.96 kB
dist/assets/icon-gift-3d-Lz8bTNOI.webp                68.71 kB
dist/assets/icon-reflex-Clpau8yW.webp                 81.14 kB
dist/assets/logo-B6DxuRMe.jpg                        117.98 kB
dist/assets/hero-banner-new-CIOKYmps.jpg             250.05 kB
dist/assets/index-DnZVuPdT.css                       310.27 kB │ gzip:  40.21 kB
dist/assets/icon-reflex-8vI30Y3_.js                    0.06 kB │ gzip:   0.08 kB
dist/assets/index-yNqE7hcw.js                          0.19 kB │ gzip:   0.17 kB
dist/assets/index-D-bbvFwL.js                          0.24 kB │ gzip:   0.18 kB
dist/assets/googleOAuth-JGVBAWbo.js                    0.25 kB │ gzip:   0.22 kB
dist/assets/index-B7-xI-UD.js                          0.27 kB │ gzip:   0.23 kB
dist/assets/audioUrl-DTWUyGYG.js                       0.29 kB │ gzip:   0.24 kB
dist/assets/textarea-Cf8BMR5P.js                       0.56 kB │ gzip:   0.36 kB
dist/assets/label-DtMY3306.js                          0.63 kB │ gzip:   0.42 kB
dist/assets/input-Bn3dxF9o.js                          0.66 kB │ gzip:   0.39 kB
dist/assets/Logo-788t6NDe.js                           0.80 kB │ gzip:   0.47 kB
dist/assets/ErrorState-Blfhu8Cr.js                     1.15 kB │ gzip:   0.69 kB
dist/assets/EmptyState-BtVdbgbB.js                     1.15 kB │ gzip:   0.60 kB
dist/assets/card-CeNyb17y.js                           1.15 kB │ gzip:   0.45 kB
dist/assets/learning-gwqzWjU8.js                       1.32 kB │ gzip:   0.46 kB
dist/assets/button-DTJat8Dm.js                         1.43 kB │ gzip:   0.71 kB
dist/assets/badge-DVx7Evxy.js                          1.48 kB │ gzip:   0.59 kB
dist/assets/PageHeader-7w_OSGn6.js                     1.65 kB │ gzip:   0.81 kB
dist/assets/NotFound-lPv1I_Z9.js                       1.84 kB │ gzip:   0.92 kB
dist/assets/progress-BHv1uvz3.js                       1.98 kB │ gzip:   0.99 kB
dist/assets/errorHandler-DK3FuJhu.js                   2.07 kB │ gzip:   1.16 kB
dist/assets/LibraryPage-BeN8KTL0.js                    2.13 kB │ gzip:   1.24 kB
dist/assets/FullTestsPage-DYghtc1n.js                  2.21 kB │ gzip:   1.30 kB
dist/assets/ListeningPage-Dq1WsX8A.js                  2.22 kB │ gzip:   1.27 kB
dist/assets/sheet-CVb49Mkn.js                          2.34 kB │ gzip:   0.92 kB
dist/assets/dialog-B1Mvpzqd.js                         2.34 kB │ gzip:   0.93 kB
dist/assets/AuthCallback-FY7izJw_.js                   2.54 kB │ gzip:   1.25 kB
dist/assets/switch-CF0KvPQo.js                         2.56 kB │ gzip:   1.28 kB
dist/assets/tabs-9rtdOKoo.js                           3.37 kB │ gzip:   1.41 kB
dist/assets/PasswordStrengthIndicator-BofP02sJ.js      3.40 kB │ gzip:   1.09 kB
dist/assets/index-MAdXbn03.js                          3.60 kB │ gzip:   1.63 kB
dist/assets/checkbox-DucMgEK8.js                       3.98 kB │ gzip:   1.76 kB
dist/assets/AdminReports-C4B2qPFD.js                   4.37 kB │ gzip:   1.82 kB
dist/assets/alert-dialog-DRmqL9NR.js                   4.89 kB │ gzip:   1.80 kB
dist/assets/ForgotPassword-DewfA5_d.js                 4.97 kB │ gzip:   2.09 kB
dist/assets/MysteryChestModal-B-qc3uDX.js              5.03 kB │ gzip:   2.13 kB
dist/assets/CourseCard-6u8UIBr4.js                     5.19 kB │ gzip:   1.99 kB
dist/assets/index-BpkHRx8Q.js                          5.36 kB │ gzip:   2.06 kB
dist/assets/FullTestList-BJ9ZA9b_.js                   5.87 kB │ gzip:   2.49 kB
dist/assets/ResetPassword-BlayNpbO.js                  5.95 kB │ gzip:   2.26 kB
dist/assets/StickyPartAudioPlayer-Bxyz3KfM.js          6.10 kB │ gzip:   2.26 kB
dist/assets/AdminStudents-aK9Pd93l.js                  6.71 kB │ gzip:   2.37 kB
dist/assets/accordion-DjbgVjTY.js                      6.75 kB │ gzip:   2.50 kB
dist/assets/AdminLayout-BJ0PQ0JX.js                    7.48 kB │ gzip:   2.58 kB
dist/assets/AdminCourseJsonImport-l_N_OfON.js          7.82 kB │ gzip:   3.37 kB
dist/assets/AdminDashboard-Drm2QFxP.js                 7.88 kB │ gzip:   2.45 kB
dist/assets/Register-DCoN3wO-.js                       8.20 kB │ gzip:   3.24 kB
dist/assets/Login-DgTOjw_Y.js                          9.79 kB │ gzip:   3.79 kB
dist/assets/AdminCourses-DzdG3Wyr.js                   9.96 kB │ gzip:   3.34 kB
dist/assets/useGamification-5mhchouF.js               10.50 kB │ gzip:   4.05 kB
dist/assets/AdminEnrollments-3hhSujU-.js              10.64 kB │ gzip:   3.29 kB
dist/assets/AdminCourseNew-CMFLyNdO.js                10.89 kB │ gzip:   3.68 kB
dist/assets/AdminStudentDetail-CXRmIqBy.js            12.49 kB │ gzip:   3.49 kB
dist/assets/homepageShowcaseService-CAdG4A3F.js       13.69 kB │ gzip:   5.61 kB
dist/assets/VocabPage-DZKqvfub.js                     14.27 kB │ gzip:   4.01 kB
dist/assets/AdminCategories-w1-AVsPE.js               14.73 kB │ gzip:   4.74 kB
dist/assets/AdminMaterials-CeNER05x.js                15.16 kB │ gzip:   4.73 kB
dist/assets/Combination-t2RocDW9.js                   15.85 kB │ gzip:   6.00 kB
dist/assets/VocabLessonPage-D2rNoLr9.js               18.54 kB │ gzip:   5.64 kB
dist/assets/StudentLayout-5IyWS9YJ.js                 19.23 kB │ gzip:   5.59 kB
dist/assets/MyCoursesPage-CrTP3PoZ.js                 19.25 kB │ gzip:   5.84 kB
dist/assets/select-DvI-3KCK.js                        21.25 kB │ gzip:   7.40 kB
dist/assets/AdminFullTestManager-ULqWvSe2.js          22.88 kB │ gzip:   7.21 kB
dist/assets/AdminBackup-gxYN05hG.js                   24.93 kB │ gzip:   7.63 kB
dist/assets/AdminGamesConfig-D_bu0Q9n.js              25.47 kB │ gzip:   7.54 kB
dist/assets/FullTestResult-BOQSesOr.js                25.77 kB │ gzip:   7.51 kB
dist/assets/QuizPage-B94rNum6.js                      26.51 kB │ gzip:   7.97 kB
dist/assets/QuizResult-CVPwn4yl.js                    28.28 kB │ gzip:   7.90 kB
dist/assets/AdminVocabPacks-C0kOCBon.js               37.48 kB │ gzip:   9.91 kB
dist/assets/GamesHub-BjOodA5u.js                      37.66 kB │ gzip:   9.43 kB
dist/assets/AdminSettings-DofKgKgu.js                 39.77 kB │ gzip:   8.79 kB
dist/assets/Profile-DCKWRjxZ.js                       40.79 kB │ gzip:  10.43 kB
dist/assets/LearnPage-CCmUJLiP.js                     40.91 kB │ gzip:  11.23 kB
dist/assets/UpgradeProModal-BOMkRkfP.js               42.21 kB │ gzip:  12.23 kB
dist/assets/AdminFullTestQuestions-DOsHOBLj.js        43.64 kB │ gzip:   9.68 kB
dist/assets/WordShooterLeaderboardModal-5gpRwQrO.js   48.07 kB │ gzip:  12.76 kB
dist/assets/FullTestExam-DNMN_LQw.js                  58.03 kB │ gzip:  15.40 kB
dist/assets/Index-BhtJNPsf.js                         59.64 kB │ gzip:  15.42 kB
dist/assets/DashboardPage-BRFxwN3T.js                 67.64 kB │ gzip:  15.24 kB
dist/assets/WordDefenseGame-q6yQIsBB.js               73.08 kB │ gzip:  18.41 kB
dist/assets/WordShooterGame-7ALBFV3i.js               78.41 kB │ gzip:  21.34 kB
dist/assets/vendor-ui-DFkus0iB.js                     80.01 kB │ gzip:  18.41 kB
dist/assets/index-CIVHi2aj.js                         95.76 kB │ gzip:  33.14 kB
dist/assets/DictationPage-uo-KE3Nl.js                110.40 kB │ gzip:  26.49 kB
dist/assets/vocabPacksService-B7ti1L1o.js            124.37 kB │ gzip:  39.89 kB
dist/assets/vendor-react-zEA-uSLV.js                 162.92 kB │ gzip:  53.16 kB
dist/assets/AdminCourseDetail-ChXwDdfi.js            186.86 kB │ gzip:  50.43 kB
dist/assets/vendor-query-CH3OBSVQ.js                 234.42 kB │ gzip:  62.91 kB
dist/assets/Part2CoachPage-Dzg2H71v.js               338.88 kB │ gzip:  55.20 kB
dist/assets/vendor-charts-D4lgbj5e.js                399.38 kB │ gzip: 107.95 kB
dist/assets/SpeakingRoomsPage-DBmObomN.js            651.43 kB │ gzip: 172.95 kB
✓ built in 31.27s

$ node scripts/check-ui-diff.mjs refactor/nestjs-backend
check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).

$ git log --oneline -3 && git diff --stat refactor/nestjs-backend
fc3faac feat(learning): migrate progress queries in Dashboard, MyCourses, and Profile to API (T-008)
c5a957d docs: record T-007 review PASS, mark LRN rows frontend done
23bcfe4 merge: T-007 learning adapter and LearnPage migration (review PASS)
 docs/PARITY.md                     |  6 +--
 docs/PROGRESS.md                   |  2 +-
 docs/tasks/T-008-progress-pages.md | 41 ++++++++++++++------
 src/lib/api/learning.test.ts       | 76 ++++++++++++++++++++++++++++++++++++++
 src/lib/api/learning.ts            | 26 +++++++++++++
 src/pages/DashboardPage.tsx        |  7 +---
 src/pages/MyCoursesPage.tsx        |  6 +--
 src/pages/Profile.tsx              |  7 +---
 8 files changed, 142 insertions(+), 29 deletions(-)
```

## 9. Câu hỏi (người làm điền khi bị chặn)
Không có. Đã hoàn thành toàn bộ yêu cầu của T-008.

## 10. Review (Claude điền)
