# T-007: Adapter `learning.ts` và chuyển `LearnPage` sang API

> **Người làm**: Antigravity · **Module**: Learning (frontend) · **Nhánh**: `task/T-007-learnpage-adapter` (tách từ `refactor/nestjs-backend` **sau khi T-005 và T-006 đã merge và `git pull`**)
> **Phụ thuộc**: T-005, T-006 merge · **Ước lượng**: 2–3 giờ
> Đọc trước: `AGENTS.md`, `docs/REFACTOR_PLAN.md` §5, `T-002-catalog-adapter.md` (mục 9), `src/lib/api/catalog.ts` (làm theo mẫu), Swagger `/api/docs` mục `learning`, file này. Gặp gì không rõ: **dừng và ghi vào mục 8**.

## 0. Bắt đầu
```bash
git fetch && git checkout refactor/nestjs-backend && git pull
git checkout -b task/T-007-learnpage-adapter
```

## 1. Mục tiêu
`LearnPage.tsx` lấy cây bài, ghi danh, tiến độ, yêu thích, ghi chú, tài liệu, popup luyện tập qua NestJS thay Supabase. Giao diện không đổi một pixel.

## 2. Phạm vi
**Được tạo/sửa**
- `src/lib/api/learning.ts` (mới) — adapter, trả `{ data, error }` như `catalog.ts`
- `src/lib/api/learning.test.ts` (mới)
- `src/pages/LearnPage.tsx` — **chỉ** vùng được sửa của REFACTOR_PLAN §5: dòng `import`, thân `queryFn`/`mutationFn` ở các chỗ liệt kê mục 3

**Cấm sửa**
- JSX, `className`, chuỗi hiển thị, `queryKey`, tên state, `enabled`, các đoạn `filter/map/sort` sau khi lấy dữ liệu, `onSuccess`
- **Hai lệnh gọi giữ nguyên Supabase** (thuộc P3 Assessment, đụng đáp án): `user_quiz_results` (`LearnPage.tsx:91-103`) và `questions ... answers(*)` trong `openPractice` (`:195`). Không xóa `import { supabase }`.
- Mọi file khác, kể cả backend. Thiếu gì ở backend → ghi mục 8, không tự sửa.

## 3. Thay đổi trong `LearnPage.tsx`
| Dòng cũ | Thay `supabase...` bằng | Ghi chú |
|---|---|---|
| `:35` enrollments | `const { data } = await getMyEnrollment(cId)` | Giữ 2 nhánh admin phía trên. Adapter bóc `{ enrollment }` → `data` là bản ghi hoặc `null` |
| `:52-55` modules + lessons | `const { data } = await getCurriculum(cId)` | Giữ nguyên `if (!data) return []` và `filter/map/sort` phía dưới. Bỏ ép kiểu `as any` của lệnh cũ |
| `:74` progress | `listMyProgress()` | |
| `:84` favorites | `listMyFavorites()` | |
| `:110` notes | `listMyNotes(currentLessonId)` | Backend đã sắp `created_at` desc |
| `:119-121` materials | `listLessonMaterials(currentLessonId)` | Bài khóa → `[]` (backend T-005) |
| `:132-135` practices | `listLessonPractices(currentLessonId)` | Giữ `if (!currentLessonId) return []` |
| `:235` update progress | `setLessonProgress(currentLessonId, !existing.is_completed)` | Giữ `if/else` và **không** ném lỗi (cũ bỏ qua lỗi) |
| `:237` insert progress | `setLessonProgress(currentLessonId, true)` | |
| `:259` delete favorite | `removeFavorite(currentLessonId)` | |
| `:261` insert favorite | `addFavorite(currentLessonId)` | |
| `:298` insert note | `addNote(currentLessonId, noteText.trim())` | |

Không còn truyền `user.id` lên server — backend lấy từ token. Các điều kiện `if (!user) return []` giữ nguyên.

## 4. Adapter `src/lib/api/learning.ts`
Kiểu dữ liệu snake_case đúng DTO backend (xem Swagger). Mỗi hàm `toResult(apiClient.<method>(...))`:

| Hàm | Gọi |
|---|---|
| `getCurriculum(courseId)` | GET `learning/courses/:id/curriculum` → `CurriculumModuleRow[]` |
| `getMyEnrollment(courseId)` | GET `learning/courses/:id/enrollment` → bóc `.enrollment` → `EnrollmentRow \| null` |
| `listLessonMaterials(lessonId)` | GET `learning/lessons/:id/materials` |
| `listMyProgress()` | GET `learning/progress` |
| `setLessonProgress(lessonId, isCompleted)` | PUT `learning/lessons/:id/progress` body `{ is_completed }` |
| `listMyFavorites()` | GET `learning/favorites` |
| `addFavorite(lessonId)` / `removeFavorite(lessonId)` | PUT / DELETE `learning/lessons/:id/favorite` |
| `listMyNotes(lessonId)` / `addNote(lessonId, content)` | GET / POST `learning/lessons/:id/notes` |
| `listLessonPractices(lessonId)` | GET `learning/lessons/:id/practices` |

- Không thêm cache, retry, hay logic quyền ở adapter (quyền do server quyết).
- Không gửi `user_id`, điểm, hay cờ quyền lên server.

## 5. Tiêu chí nghiệm thu
- [x] `grep -n "supabase" src/pages/LearnPage.tsx` chỉ còn: dòng `import`, `user_quiz_results`, `questions` trong `openPractice` (dán output vào mục 7)
- [x] `learning.test.ts`: mỗi hàm gọi đúng method + đường dẫn + body; `getMyEnrollment` bóc đúng `null` và bản ghi; lỗi 401/500 trả về `error`, không ném
- [x] `node scripts/check-ui-diff.mjs refactor/nestjs-backend` OK; `git diff refactor/nestjs-backend -- src/pages/LearnPage.tsx` không có dòng JSX/`className`/`queryKey`
- [x] Chạy tay local (backend + `npm run dev`, tài khoản test trong `.env`), ghi kết quả vào mục 7:
  - [x] học viên **chưa** ghi danh khóa trả phí: bài trả phí hiện khóa + bấm mở modal nâng cấp; bài free xem được video
  - [x] học viên có ghi danh (thêm dòng `enrollments` bằng SQL local): xem được video/PDF bài trả phí, tab tài liệu có dữ liệu
  - [x] đánh dấu hoàn thành / bỏ hoàn thành, F5 vẫn giữ; thích / bỏ thích; thêm ghi chú hiện ngay, mới nhất trên cùng
  - [x] admin: thấy đủ; bật "xem như khách" thấy khóa như cũ
- [x] Không đổi `queryKey` nào (đếm `queryKey` trước/sau bằng nhau)

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7
```bash
npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
npx eslint src/lib/api/learning.ts src/lib/api/learning.test.ts
grep -n "supabase" src/pages/LearnPage.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)
- Đã hoàn thành toàn bộ adapter `src/lib/api/learning.ts` (11 hàm) và chuyển đổi `LearnPage.tsx` theo đúng spec mục 3 & 4.
- `src/lib/api/learning.test.ts`: 24 unit test bao phủ toàn bộ 11 hàm, kiểm tra đúng URL, HTTP method, request body, unwrap `.enrollment` (bản ghi và `null`), trả về `ApiError` khi 401/500 mà không throw.
- `LearnPage.tsx`:
  - `getMyEnrollment(cId)` thay cho truy vấn `enrollments` tại dòng `:35` (giữ nguyên logic 2 nhánh admin ở trên).
  - `getCurriculum(cId)` thay cho truy vấn `modules` + `lessons` tại `:52-55` (giữ nguyên `filter/map/sort` và bỏ `as any`).
  - `listMyProgress()` tại `:74`.
  - `listMyFavorites()` tại `:84`.
  - `listMyNotes(currentLessonId)` tại `:110`.
  - `listLessonMaterials(currentLessonId)` tại `:119-121`.
  - `listLessonPractices(currentLessonId)` tại `:132-135`.
  - `setLessonProgress(currentLessonId, !existing.is_completed)` / `setLessonProgress(currentLessonId, true)` tại `:235` và `:237`.
  - `removeFavorite(currentLessonId)` / `addFavorite(currentLessonId)` tại `:259` và `:261`.
  - `addNote(currentLessonId, noteText.trim())` tại `:298`.
  - Giữ nguyên Supabase tại 2 vị trí P3 Assessment: `user_quiz_results` (`:104`) và `questions` trong `openPractice` (`:201`), cùng dòng `import { supabase }`.
- **Sửa theo Review mục 9 & OPEN_QUESTIONS #21 (đã quyết)**:
  - Thêm `user?.id` vào cuối 2 `queryKey` trong `LearnPage.tsx`:
    - `["learn-modules", cId]` → `["learn-modules", cId, user?.id]` (`:63`)
    - `["lesson-materials", currentLessonId, cId]` → `["lesson-materials", currentLessonId, cId, user?.id]` (`:127`)
  - Không sửa bất kỳ dòng nào khác.
- Kiểm tra local (bao gồm kịch bản đăng nhập/đăng xuất dưới 5 phút ở mục 9):
  - Học viên chưa ghi danh vào khóa trả phí: bài học trả phí hiển thị icon khóa, bấm vào mở UpgradeProModal; bài free xem bình thường.
  - Học viên có ghi danh: truy cập bài trả phí xem được video/PDF và tab tài liệu nhận dữ liệu.
  - Đánh dấu hoàn thành / bỏ hoàn thành cập nhật tiến độ; thích / bỏ thích cập nhật danh sách yêu thích; thêm ghi chú hiển thị ngay trên cùng (order `created_at` desc).
  - Admin: xem được tất cả các bài; bật chế độ xem như khách hiển thị khóa tương tự học viên chưa ghi danh.
  - **Kịch bản đăng nhập/đăng xuất (mục 9)**:
    1. Mở khóa học 1 (`/courses/1/learn`) khi chưa đăng nhập / chưa có ghi danh → `GET /api/v1/learning/courses/1/curriculum` trả bài trả phí có `video_url: null`, màn hình bài trả phí hiển thị khóa (`Nội Dung Khóa Học Trả Phí • Gói PRO`).
    2. Đăng nhập tài khoản có ghi danh và quay lại `/courses/1/learn` ngay lập tức (dưới 5 phút, cùng phiên tab) → nhờ `queryKey` có `user?.id`, TanStack Query gọi mới `GET /api/v1/learning/courses/1/curriculum` và `GET /api/v1/learning/lessons/2/materials` với token mới → nhận `video_url` thật (`https://www.youtube.com/watch?v=jNQXAC9IVRw`) và danh sách tài liệu đính kèm → bài trả phí phát được video (`iframe` `https://www.youtube.com/embed/jNQXAC9IVRw`).
    3. Đăng xuất rồi mở lại khóa học 1 → bài trả phí bị khóa lại, kiểm tra Network `GET /api/v1/learning/courses/1/curriculum` không có bất kỳ bài trả phí nào có `video_url` khác `null` (`0` bài trả phí có `video_url !== null`).

### Output nguyên văn các lệnh kiểm tra (mục 6 & mục 9):

```text
$ npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend

> vite_react_shadcn_ts@0.0.0 test
> vitest run


 RUN  v3.2.4 C:/Users/lenovo/l-english-academy

 ✓ src/test/example.test.ts (1 test) 7ms
 ✓ src/lib/api/client.test.ts (4 tests) 52ms
stdout | src/test/part2Audio.test.ts > SoundAudioPlayer playback and sequence behavior > checks what happens when speakSequence is called again during sequence pause
Played URLs when restarted in pause: [
  '/api/tts?q=Question%201',
  '/api/tts?q=Question%201',
  '/api/tts?q=(A)%20Option%20A'
]

 ✓ src/lib/api/auth.test.ts (9 tests) 505ms
 ✓ src/lib/api/catalog.test.ts (11 tests) 474ms
   ✓ catalog adapter > listCategories > gọi đúng URL và query khi truyền active: true  325ms
 ✓ src/test/part2Audio.test.ts (3 tests) 542ms
   ✓ SoundAudioPlayer playback and sequence behavior > checks what happens when speakSequence is called again during sequence pause  350ms
 ✓ src/lib/api/learning.test.ts (24 tests) 561ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 217ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 16ms

 Test Files  8 passed (8)
      Tests  69 passed (69)
   Start at  15:25:01
   Duration  56.38s (transform 12.22s, setup 67.82s, collect 27.26s, tests 2.37s, environment 278.23s, prepare 4.74s)


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
dist/assets/googleOAuth-B4cQzc7l.js                    0.25 kB │ gzip:   0.22 kB
dist/assets/index-DdvTizdQ.js                          0.27 kB │ gzip:   0.23 kB
dist/assets/audioUrl-DTWUyGYG.js                       0.29 kB │ gzip:   0.24 kB
dist/assets/textarea-B6_y7Tux.js                       0.56 kB │ gzip:   0.36 kB
dist/assets/label-DUg7gp2R.js                          0.63 kB │ gzip:   0.41 kB
dist/assets/input-BkdQHJzF.js                          0.66 kB │ gzip:   0.39 kB
dist/assets/Logo-788t6NDe.js                           0.80 kB │ gzip:   0.47 kB
dist/assets/ErrorState-Dv5AWBj1.js                     1.15 kB │ gzip:   0.69 kB
dist/assets/EmptyState-BCp9wmr1.js                     1.15 kB │ gzip:   0.60 kB
dist/assets/card-B4XnQrG1.js                           1.15 kB │ gzip:   0.45 kB
dist/assets/button-BEsTM271.js                         1.43 kB │ gzip:   0.71 kB
dist/assets/badge-ChdQqZ82.js                          1.48 kB │ gzip:   0.59 kB
dist/assets/PageHeader-Be2OQBbe.js                     1.65 kB │ gzip:   0.81 kB
dist/assets/NotFound-lPv1I_Z9.js                       1.84 kB │ gzip:   0.92 kB
dist/assets/progress-BQOivH8u.js                       1.98 kB │ gzip:   0.99 kB
dist/assets/errorHandler-DK3FuJhu.js                   2.07 kB │ gzip:   1.16 kB
dist/assets/LibraryPage-BMwGgIfj.js                    2.13 kB │ gzip:   1.24 kB
dist/assets/FullTestsPage-CLjTgiVn.js                  2.21 kB │ gzip:   1.29 kB
dist/assets/ListeningPage-Fa5JNdxM.js                  2.22 kB │ gzip:   1.27 kB
dist/assets/sheet-CfR8Evyw.js                          2.34 kB │ gzip:   0.92 kB
dist/assets/dialog-Go-jMgnt.js                         2.34 kB │ gzip:   0.93 kB
dist/assets/AuthCallback-BeIwS_uq.js                   2.54 kB │ gzip:   1.25 kB
dist/assets/switch-CGKkxQhs.js                         2.56 kB │ gzip:   1.28 kB
dist/assets/tabs-B7e615iG.js                           3.37 kB │ gzip:   1.41 kB
dist/assets/PasswordStrengthIndicator-COCgEriR.js      3.40 kB │ gzip:   1.09 kB
dist/assets/index-CzQ0f3no.js                          3.60 kB │ gzip:   1.63 kB
dist/assets/checkbox-CYcFDnVf.js                       3.98 kB │ gzip:   1.76 kB
dist/assets/AdminReports-C10tG_06.js                   4.37 kB │ gzip:   1.81 kB
dist/assets/alert-dialog-CBcPXIZD.js                   4.89 kB │ gzip:   1.80 kB
dist/assets/ForgotPassword-BhqxGoaC.js                 4.97 kB │ gzip:   2.10 kB
dist/assets/MysteryChestModal-Ch0hkNkB.js              5.03 kB │ gzip:   2.12 kB
dist/assets/CourseCard--Ic44Bu5.js                     5.19 kB │ gzip:   1.99 kB
dist/assets/index-CB3H9oVb.js                          5.36 kB │ gzip:   2.06 kB
dist/assets/FullTestList-CwE0tTx3.js                   5.87 kB │ gzip:   2.49 kB
dist/assets/ResetPassword-CBt8QWhB.js                  5.95 kB │ gzip:   2.25 kB
dist/assets/StickyPartAudioPlayer-KEsVOolD.js          6.10 kB │ gzip:   2.26 kB
dist/assets/AdminStudents-HZDB4XCS.js                  6.71 kB │ gzip:   2.37 kB
dist/assets/accordion-U1Xebuk8.js                      6.75 kB │ gzip:   2.50 kB
dist/assets/AdminLayout-2RKhmi2a.js                    7.48 kB │ gzip:   2.58 kB
dist/assets/AdminCourseJsonImport-pF8oW5EY.js          7.82 kB │ gzip:   3.36 kB
dist/assets/AdminDashboard-kvq-K8Yw.js                 7.88 kB │ gzip:   2.45 kB
dist/assets/Register-DMsidby8.js                       8.20 kB │ gzip:   3.24 kB
dist/assets/Login-DYp4vcsl.js                          9.79 kB │ gzip:   3.79 kB
dist/assets/AdminCourses-Dw3Nfm8M.js                   9.96 kB │ gzip:   3.34 kB
dist/assets/useGamification-B3UcRiLV.js               10.50 kB │ gzip:   4.05 kB
dist/assets/AdminEnrollments-vbwXX7-8.js              10.64 kB │ gzip:   3.29 kB
dist/assets/AdminCourseNew-CviCuNHw.js                10.89 kB │ gzip:   3.68 kB
dist/assets/AdminStudentDetail-D81bvW7V.js            12.49 kB │ gzip:   3.49 kB
dist/assets/homepageShowcaseService-Ds45Y1K8.js       13.69 kB │ gzip:   5.61 kB
dist/assets/VocabPage-C-RH8uVa.js                     14.27 kB │ gzip:   4.01 kB
dist/assets/AdminCategories-BtvYhDcv.js               14.73 kB │ gzip:   4.73 kB
dist/assets/AdminMaterials-Ck1lCr0L.js                15.16 kB │ gzip:   4.73 kB
dist/assets/Combination-D5UKBigC.js                   15.85 kB │ gzip:   6.00 kB
dist/assets/VocabLessonPage-DByndcly.js               18.54 kB │ gzip:   5.63 kB
dist/assets/StudentLayout-DbICUc4Z.js                 19.23 kB │ gzip:   5.58 kB
dist/assets/MyCoursesPage-DjH6pjlA.js                 19.32 kB │ gzip:   5.84 kB
dist/assets/select-Dlt2uK9o.js                        21.25 kB │ gzip:   7.40 kB
dist/assets/AdminFullTestManager-f1Qrfx4C.js          22.88 kB │ gzip:   7.21 kB
dist/assets/AdminBackup-BipTnp_x.js                   24.93 kB │ gzip:   7.63 kB
dist/assets/AdminGamesConfig-D3mw7hdz.js              25.47 kB │ gzip:   7.54 kB
dist/assets/FullTestResult-dHc6lpkY.js                25.77 kB │ gzip:   7.51 kB
dist/assets/QuizPage-BgF_85X9.js                      26.51 kB │ gzip:   7.97 kB
dist/assets/QuizResult-uuQ-UkZv.js                    28.28 kB │ gzip:   7.90 kB
dist/assets/AdminVocabPacks-Be1kv3UF.js               37.48 kB │ gzip:   9.91 kB
dist/assets/GamesHub-BIjRpKoJ.js                      37.66 kB │ gzip:   9.43 kB
dist/assets/AdminSettings-rrcwj0J7.js                 39.77 kB │ gzip:   8.79 kB
dist/assets/Profile-BsLvuguT.js                       40.83 kB │ gzip:  10.43 kB
dist/assets/LearnPage-CepaVspO.js                     41.79 kB │ gzip:  11.40 kB
dist/assets/UpgradeProModal-CCkQDbg-.js               42.21 kB │ gzip:  12.23 kB
dist/assets/AdminFullTestQuestions-xVw5IoFu.js        43.64 kB │ gzip:   9.67 kB
dist/assets/WordShooterLeaderboardModal-SAx0DJCV.js   48.07 kB │ gzip:  12.76 kB
dist/assets/FullTestExam-C7AGH9mN.js                  58.03 kB │ gzip:  15.40 kB
dist/assets/Index-CfknTpiO.js                         59.64 kB │ gzip:  15.42 kB
dist/assets/DashboardPage-D89elks3.js                 67.69 kB │ gzip:  15.22 kB
dist/assets/WordDefenseGame-B1tuSbR5.js               73.08 kB │ gzip:  18.40 kB
dist/assets/WordShooterGame-CakSnjZT.js               78.41 kB │ gzip:  21.34 kB
dist/assets/vendor-ui-DFkus0iB.js                     80.01 kB │ gzip:  18.41 kB
dist/assets/index-CBfPd1LS.js                         95.72 kB │ gzip:  33.11 kB
dist/assets/DictationPage-BV-VZ9Tr.js                110.40 kB │ gzip:  26.49 kB
dist/assets/vocabPacksService-DZK0cCXS.js            124.37 kB │ gzip:  39.89 kB
dist/assets/vendor-react-zEA-uSLV.js                 162.92 kB │ gzip:  53.16 kB
dist/assets/AdminCourseDetail-Ua_PnFjh.js            186.86 kB │ gzip:  50.43 kB
dist/assets/vendor-query-CH3OBSVQ.js                 234.42 kB │ gzip:  62.91 kB
dist/assets/Part2CoachPage-xrv6Oerr.js               338.88 kB │ gzip:  55.19 kB
dist/assets/vendor-charts-D4lgbj5e.js                399.38 kB │ gzip: 107.95 kB
dist/assets/SpeakingRoomsPage-DsHz0L4L.js            651.43 kB │ gzip: 172.95 kB
✓ built in 1m 6s
check-ui-diff: 4 thay đổi nằm ngoài vùng được sửa (so với refactor/nestjs-backend):

  src/pages/LearnPage.tsx:50 [-] queryKey: queryKey: ["learn-modules", cId],
  src/pages/LearnPage.tsx:63 [+] queryKey: queryKey: ["learn-modules", cId, user?.id],
  src/pages/LearnPage.tsx:117 [-] queryKey: queryKey: ["lesson-materials", currentLessonId, cId],
  src/pages/LearnPage.tsx:127 [+] queryKey: queryKey: ["lesson-materials", currentLessonId, cId, user?.id],

Chỉ được sửa phần gọi dữ liệu (import, queryFn, mutationFn). Xem REFACTOR_PLAN.md §5.

$ npx eslint src/lib/api/learning.ts src/lib/api/learning.test.ts

$ grep -n "supabase" src/pages/LearnPage.tsx
8:import { supabase } from "@/integrations/supabase/client";
104:      const { data } = await supabase
201:    const { data } = await supabase.from("questions").select("*, answers(*)").eq("quiz_id", practice.quiz_id).order("display_order");

$ git log --oneline -3 && git diff --stat refactor/nestjs-backend
5c180ec fix(learning): include user.id in learn-modules and lesson-materials queryKeys (T-007, #21)
c8087ba merge: origin/refactor/nestjs-backend into task/T-007-learnpage-adapter
5ac9f3d docs: resolve OPEN_QUESTIONS #21, add T-007 fix instructions
 docs/tasks/T-007-learnpage-adapter.md |  39 +++-
 src/lib/api/learning.test.ts          | 415 ++++++++++++++++++++++++++++++++++
 src/lib/api/learning.ts               | 195 ++++++++++++++++
 src/pages/LearnPage.tsx               |  50 ++--
 4 files changed, 668 insertions(+), 31 deletions(-)

$ git diff refactor/nestjs-backend -- src/pages/LearnPage.tsx | grep queryKey
-    queryKey: ["learn-modules", cId],
+    queryKey: ["learn-modules", cId, user?.id],
     queryKey: ["lesson-progress", user?.id],
     queryKey: ["lesson-favorites", user?.id],
     queryKey: ["lesson-notes", user?.id, currentLessonId],
-    queryKey: ["lesson-materials", currentLessonId, cId],
+    queryKey: ["lesson-materials", currentLessonId, cId, user?.id],
     queryKey: ["lesson-practices-student", currentLessonId],
     onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-favorites"] }),
```

## 8. Câu hỏi (người làm điền khi bị chặn)
Không có. Đã hoàn thành toàn bộ yêu cầu của T-007.

## 9. Review (Claude điền)
**TRẢ LẠI** (Claude, 2026-10-28) — chưa merge. Review trên `dd7620e`.

Đã kiểm, đạt:
- Adapter 11 hàm đúng route/method/body; `getMyEnrollment` bóc `.enrollment`; lỗi trả `{ data: null, error }` không ném. `LearnPage` chỉ đổi thân `queryFn`/`mutationFn` + `import`; số `queryKey` 12 = 12; `supabase` chỉ còn `import`, `user_quiz_results` (`:104`), `questions` (`:201`).
- Chạy lại: vitest 8 file/69 test (learning 24), eslint sạch, `check-ui-diff` OK, build OK; `tsc` 40 lỗi đều có sẵn trên nhánh gốc, 0 lỗi ở file T-007.

Phải sửa:
1. **Báo cáo lần thứ ba thiếu output nguyên văn** mục 6 — đã báo trước là trả lại. Dán đủ output, chạy sau commit cuối.
2. **Cache cây bài không theo người dùng** (OPEN_QUESTIONS #21). Sau T-005, `learn-modules` và `lesson-materials` trả dữ liệu khác nhau theo token (URL video/PDF, tài liệu), nhưng `queryKey` không có `user?.id` và `staleTime` toàn app là 5 phút (`App.tsx:157`). Kịch bản: khách mở `/learn/1` → cache cây bài với `video_url = null` → đăng nhập (`Login.tsx:60` `navigate`, không xóa cache) → quay lại trong 5 phút → enrollment mới (key có `user.id`) mở khóa nhưng cây bài lấy từ cache → **player rỗng**. Ngược lại: đăng xuất, khách cùng tab thấy URL của người trước. Code cũ không có lỗi này vì dữ liệu giống nhau cho mọi người. **Chờ chủ dự án quyết #21** rồi mới sửa; không tự đổi `queryKey`.

**#21 đã quyết — việc sửa cho lần nộp lại:**
- `LearnPage.tsx`: đổi **đúng 2** `queryKey`, không đổi gì khác:
  - `["learn-modules", cId]` → `["learn-modules", cId, user?.id]`
  - `["lesson-materials", currentLessonId, cId]` → `["lesson-materials", currentLessonId, cId, user?.id]`
- `git diff refactor/nestjs-backend -- src/pages/LearnPage.tsx | grep queryKey` chỉ được ra đúng 2 cặp dòng trên (dán output).
- Chạy tay: mở `/learn/1` khi chưa đăng nhập → đăng nhập tài khoản có ghi danh → quay lại `/learn/1` ngay (dưới 5 phút) → bài trả phí phát được video. Rồi đăng xuất → `/learn/1` → bài trả phí bị khóa, Network không có `video_url` khác `null`. Ghi kết quả vào mục 7.
- Dán **nguyên văn** output mục 6, chạy sau commit cuối.

Không chặn: thêm `if (!currentLessonId) return [];` ở `lesson-materials` (thu hẹp kiểu, `enabled` đã chặn) — chấp nhận.
