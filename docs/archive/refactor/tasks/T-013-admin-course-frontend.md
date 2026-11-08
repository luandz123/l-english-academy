# T-013: Trang admin khóa học — chương, bài, popup luyện tập qua API (frontend)

> **Người làm**: Antigravity · **Module**: Catalog + Learning (frontend admin; ngoại lệ luật 6 đã duyệt vì đọc/ghi cùng một màn hình phải chuyển cùng lúc) · **Nhánh**: `task/T-013-admin-course-frontend`
> **Phụ thuộc**: **T-012 đã ✅ merged** trong `QUEUE.md` (T-009 đã merge) · **Ước lượng**: 3 giờ
> Đọc trước: `AGENTS.md`, `T-009-learning-admin.md` mục 4 + 9, `T-012-catalog-admin-modules.md` mục 4, `src/lib/api/learning.ts`, `src/lib/api/catalog.ts`, file này.

## 1. Mục tiêu
Màn hình `/admin/courses/:id` hiện đọc chương/bài/quiz từ Supabase và ghi thẳng Supabase. Chuyển **cả đọc lẫn ghi** của chương, bài, popup luyện tập sang API trong một task (ghi API mà đọc Supabase thì admin không thấy thay đổi).

## 2. Phạm vi
**Được sửa**: `src/lib/api/catalog.ts`, `src/lib/api/learning.ts` (+ `.test.ts`) — thêm hàm; và **chỉ** biểu thức gọi dữ liệu (thân `queryFn`/`mutationFn`, biểu thức `supabase…` trong handler) + `import` ở: `src/pages/admin/AdminCourseDetail.tsx`, `src/components/admin/ModuleManager.tsx`, `src/components/admin/LessonManager.tsx`, `src/components/admin/LessonPracticeManager.tsx`.
**Cấm**: JSX, `className`, câu chữ, `queryKey`, `onSuccess`/`onError`, `setQueryData`; backend; giữ Supabase cho: upload PDF (`storage`, P4), Quiz CRUD độc lập trong `LessonManager` (`:560-600`, P3), `admin-course-enrollments`, `admin-course-materials` ở `AdminCourseDetail`.

## 3. Thay thế
| Chỗ cũ | Thay bằng |
|---|---|
| `AdminCourseDetail.tsx:159-165` `modules.select("*, lessons(*), quizzes(*)")` | `getAdminCourseModules(id)` → `data ?? []` |
| `ModuleManager.tsx:84` toggle `is_free` | `patchModule(mod.id, { is_free: newStatus })`, có `error` → `throw error` |
| `ModuleManager.tsx:162` toggle `is_published` | `patchModule(mod.id, { is_published: newStatus }).then(({ error }) => …)` (giữ nguyên thân `.then`) |
| `ModuleManager.tsx:256-258` vòng lặp `display_order` | `await reorderModules(courseId, reordered.map((m: any) => m.id))` |
| `ModuleManager.tsx:278-284` vòng lặp `is_free` | `const { error } = await setFreeModule(courseId, part1Module.id); if (error) throw error;` (giữ đoạn chọn `part1Module`) |
| `ModuleManager.tsx:299-316` sửa/tạo | `updateModule(editingModule.id, { title, description, is_free })` / `createModule(courseId, { title, description, is_free })` — **bỏ** tính `maxOrder` |
| `ModuleManager.tsx:333` xóa | `deleteModule(id)` |
| `LessonManager.tsx:105`, `:125` toggle | `patchLesson(l.id, { is_free })` / `patchLesson(l.id, { is_published })` + giữ `.then(({ error }) => …)` |
| `LessonManager.tsx:211-213` vòng lặp | `await reorderLessons(moduleId, reordered.map((l: any) => l.id))` |
| `LessonManager.tsx:244-275` lưu bài | `createLesson(moduleId, body)` / `updateLesson(editingLesson.id, body)`, `body = { title: lessonTitle, lesson_type: lessonType, video_url: videoUrl \|\| null, pdf_url: pdfUrl \|\| null, duration_seconds: <như cũ> }`; có `error` → `throw error`. **Bỏ** tạo quiz và tính `display_order` ở client (server làm, T-009) |
| `LessonManager.tsx:288` xóa | `deleteLesson(id)` |
| `LessonPracticeManager.tsx:23-26` đọc | `listLessonPractices(lessonId)` (đã có từ T-007) → `data ?? []` |
| `LessonPracticeManager.tsx:31-40` quiz của khóa | `getAdminCourseModules(courseId)` rồi `flatMap(m => m.quizzes.map(q => ({ id: q.id, title: q.title, total_questions: q.total_questions, modules: { course_id: courseId } })))` |
| `LessonPracticeManager.tsx:60-62` lưu | `updatePractice(editingPractice.id, body)` / `createPractice(lessonId, body)`, `body = { quiz_id, trigger_at_seconds, title }` — **bỏ** `lesson_id`, `display_order`; **không** ném lỗi (cũ bỏ qua lỗi) |
| `LessonPracticeManager.tsx:74` xóa | `deletePractice(id)` — không ném lỗi |

## 4. Adapter
Thêm, mỗi hàm `toResult(apiClient.<method>(…))`, trả `{ data, error }`, không ném:
- `catalog.ts`: `getAdminCourseModules(courseId)` GET `catalog/admin/courses/:id/modules`; `createModule(courseId, body)` POST; `updateModule(id, body)` PUT `catalog/admin/modules/:id`; `patchModule(id, body)` PATCH; `deleteModule(id)` DELETE; `reorderModules(courseId, moduleIds)` PUT `…/module-order` `{ module_ids }`; `setFreeModule(courseId, moduleId)` PUT `…/free-module` `{ module_id }`.
- `learning.ts`: `createLesson(moduleId, body)`, `updateLesson(id, body)`, `patchLesson(id, body)`, `deleteLesson(id)`, `reorderLessons(moduleId, lessonIds)`, `createPractice(lessonId, body)`, `updatePractice(id, body)`, `deletePractice(id)` — route T-009 mục 4.
- Lỗi backend có `message` tiếng Việt → `getFriendlyErrorMessage`/`error.message` hiển thị như cũ; không đổi mã lỗi.

## 5. Tiêu chí nghiệm thu
- [x] `grep -nE 'from\("(modules|lessons|lesson_practices)"\)' src/pages/admin/AdminCourseDetail.tsx src/components/admin/ModuleManager.tsx src/components/admin/LessonManager.tsx src/components/admin/LessonPracticeManager.tsx` rỗng; `from("quizzes")` chỉ còn ở Quiz CRUD độc lập (và helper `CreateQuizForLesson` :567-593 được giữ theo mục 2)
- [x] Adapter test: mỗi hàm đúng method/URL/body; không gửi `display_order`, `course_id`, `module_id` trong body; lỗi không ném
- [x] `check-ui-diff` OK; số `queryKey` mỗi file không đổi
- [x] Kiểm tra các luồng: tạo/sửa/xóa chương; bật/tắt free, ẩn/hiện; kéo thả chương và bài; "cấu hình 1 chạm"; tạo bài video và bài exam (bài exam có quiz tự tạo trên server); popup luyện tập thêm/sửa/xóa; dữ liệu đồng bộ qua API backend NestJS.

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
npx eslint src/lib/api/catalog.ts src/lib/api/catalog.test.ts src/lib/api/learning.ts src/lib/api/learning.test.ts
grep -nE 'from\("(modules|lessons|lesson_practices|quizzes)"\)' src/pages/admin/AdminCourseDetail.tsx src/components/admin/ModuleManager.tsx src/components/admin/LessonManager.tsx src/components/admin/LessonPracticeManager.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)
- **Adapter catalog (`src/lib/api/catalog.ts`, `src/lib/api/catalog.test.ts`)**: Thêm các hàm admin module (`getAdminCourseModules`, `createModule`, `updateModule`, `patchModule`, `deleteModule`, `reorderModules`, `setFreeModule`) kèm bộ 19 unit test kiểm tra đúng URL, method, body (không gửi `course_id`, `display_order`), và bắt lỗi trả về `ApiError`.
- **Adapter learning (`src/lib/api/learning.ts`, `src/lib/api/learning.test.ts`)**: Thêm các hàm admin lesson và practice (`createLesson`, `updateLesson`, `patchLesson`, `deleteLesson`, `reorderLessons`, `createPractice`, `updatePractice`, `deletePractice`) kèm bộ 43 unit test kiểm tra đúng URL, method, body (không gửi `module_id`, `lesson_id`, `display_order`), xử lý 204 No Content và bắt lỗi trả về `ApiError`.
- **Chuyển đổi giao diện**:
  - `AdminCourseDetail.tsx`: Chuyển `admin-course-modules` sang `getAdminCourseModules(id)`.
  - `ModuleManager.tsx`: Thay toàn bộ thao tác Supabase bằng `createModule`, `updateModule`, `patchModule`, `deleteModule`, `reorderModules`, `setFreeModule`. Bỏ tính `maxOrder` ở client.
  - `LessonManager.tsx`: Thay toggle `is_free`, `is_published`, sắp xếp thứ tự và lưu bài bằng `patchLesson`, `reorderLessons`, `createLesson`, `updateLesson`, `deleteLesson`. Bỏ logic tự tạo quiz và tính `display_order` ở client (server T-009 tự xử lý trong transaction). Giữ lại Quiz CRUD độc lập theo mục 2.
  - `LessonPracticeManager.tsx`: Thay đọc practice bằng `listLessonPractices`, đọc quiz của khóa bằng `getAdminCourseModules`, lưu/xóa bằng `createPractice`, `updatePractice`, `deletePractice`. Bỏ `lesson_id` và `display_order` ở client.
- **Kiểm thử & UI diff**: Vitest 11 test suites / 118 tests passed; build thành công; `check-ui-diff` xác nhận 0% lệch giao diện JSX/CSS/Tailwind so với `refactor/nestjs-backend`.

Output nguyên văn các lệnh ở mục 6:
```text
> vite_react_shadcn_ts@0.0.0 test
> vitest run


 RUN  v3.2.4 C:/Users/lenovo/l-english-academy

 ✓ src/test/example.test.ts (1 test) 2ms
 ✓ src/lib/api/client.test.ts (4 tests) 21ms
 ✓ src/lib/api/fullTest.test.ts (5 tests) 34ms
 ✓ src/lib/api/assessment.test.ts (13 tests) 34ms
 ✓ src/lib/api/payments.test.ts (4 tests) 38ms
 ✓ src/lib/api/auth.test.ts (9 tests) 40ms
 ✓ src/lib/api/catalog.test.ts (19 tests) 31ms
stdout | src/test/part2Audio.test.ts > SoundAudioPlayer playback and sequence behavior > checks what happens when speakSequence is called again during sequence pause
Played URLs when restarted in pause: [
  '/api/tts?q=Question%201',
  '/api/tts?q=Question%201',
  '/api/tts?q=(A)%20Option%20A'
]

 ✓ src/test/part2Audio.test.ts (3 tests) 394ms
 ✓ src/lib/api/learning.test.ts (43 tests) 34ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 18ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 11ms

 Test Files  11 passed (11)
      Tests  118 passed (118)
   Start at  23:03:09
   Duration  5.90s (transform 2.16s, setup 1.86s, collect 6.07s, tests 655ms, environment 17.19s, prepare 2.44s)


> vite_react_shadcn_ts@0.0.0 build
> vite build

vite v5.4.19 building for production...
transforming...
✓ 2736 modules transformed.
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
dist/assets/googleOAuth-BsNYAUUO.js                    0.25 kB │ gzip:   0.22 kB
dist/assets/index-DXMkuiAO.js                          0.27 kB │ gzip:   0.23 kB
dist/assets/audioUrl-DTWUyGYG.js                       0.29 kB │ gzip:   0.24 kB
dist/assets/textarea-BuxNuOIQ.js                       0.56 kB │ gzip:   0.36 kB
dist/assets/label-c4DUGzdM.js                          0.63 kB │ gzip:   0.42 kB
dist/assets/input-YnrrM4gL.js                          0.66 kB │ gzip:   0.40 kB
dist/assets/Logo-788t6NDe.js                           0.80 kB │ gzip:   0.47 kB
dist/assets/fullTest-J2SGjQRo.js                       0.86 kB │ gzip:   0.34 kB
dist/assets/assessment-BCK_e2P2.js                     0.97 kB │ gzip:   0.39 kB
dist/assets/ErrorState-BbenUM4m.js                     1.15 kB │ gzip:   0.69 kB
dist/assets/EmptyState-BtsDpuLv.js                     1.15 kB │ gzip:   0.60 kB
dist/assets/card-BtTuj6X0.js                           1.15 kB │ gzip:   0.46 kB
dist/assets/button-BDd3YHG2.js                         1.43 kB │ gzip:   0.72 kB
dist/assets/badge-C6tGJO_y.js                          1.48 kB │ gzip:   0.59 kB
dist/assets/PageHeader-BvymJZhQ.js                     1.65 kB │ gzip:   0.81 kB
dist/assets/NotFound-lPv1I_Z9.js                       1.84 kB │ gzip:   0.92 kB
dist/assets/progress-Djwsg7F2.js                       1.98 kB │ gzip:   0.99 kB
dist/assets/errorHandler-DK3FuJhu.js                   2.07 kB │ gzip:   1.16 kB
dist/assets/LibraryPage-BwEuA1-x.js                    2.13 kB │ gzip:   1.24 kB
dist/assets/FullTestsPage-DPEyQKKI.js                  2.21 kB │ gzip:   1.30 kB
dist/assets/ListeningPage-DKyjF6yE.js                  2.22 kB │ gzip:   1.27 kB
dist/assets/sheet-CjYDHxiX.js                          2.34 kB │ gzip:   0.92 kB
dist/assets/dialog-Ci4l6mr9.js                         2.34 kB │ gzip:   0.94 kB
dist/assets/AuthCallback-C-ZccewH.js                   2.54 kB │ gzip:   1.25 kB
dist/assets/switch-C2RRi_ak.js                         2.56 kB │ gzip:   1.28 kB
dist/assets/learning-C_HsKCMl.js                       2.72 kB │ gzip:   0.76 kB
dist/assets/tabs-CPXIKM5A.js                           3.37 kB │ gzip:   1.41 kB
dist/assets/PasswordStrengthIndicator-BDSXfOcS.js      3.40 kB │ gzip:   1.09 kB
dist/assets/index-Ct8MJmwR.js                          3.60 kB │ gzip:   1.63 kB
dist/assets/checkbox-Cg24xXFt.js                       3.98 kB │ gzip:   1.76 kB
dist/assets/AdminReports-BW_zglSo.js                   4.37 kB │ gzip:   1.82 kB
dist/assets/alert-dialog-nnDTg1Dt.js                   4.89 kB │ gzip:   1.80 kB
dist/assets/ForgotPassword-KtGoQbDb.js                 4.97 kB │ gzip:   2.10 kB
dist/assets/MysteryChestModal-CVcJMtVd.js              5.03 kB │ gzip:   2.13 kB
dist/assets/CourseCard-DrlGmX-h.js                     5.19 kB │ gzip:   1.99 kB
dist/assets/index-nE3aBiSV.js                          5.36 kB │ gzip:   2.06 kB
dist/assets/FullTestList-1-aL25A7.js                   5.87 kB │ gzip:   2.49 kB
dist/assets/ResetPassword-CJg2MKZw.js                  5.95 kB │ gzip:   2.26 kB
dist/assets/StickyPartAudioPlayer-BflDp8vM.js          6.10 kB │ gzip:   2.26 kB
dist/assets/AdminStudents-BW8WAIsq.js                  6.71 kB │ gzip:   2.37 kB
dist/assets/accordion-BxUtPAf8.js                      6.75 kB │ gzip:   2.50 kB
dist/assets/AdminLayout-CwsDi9zW.js                    7.48 kB │ gzip:   2.58 kB
dist/assets/AdminCourseJsonImport-HWUEh63L.js          7.82 kB │ gzip:   3.36 kB
dist/assets/AdminDashboard-BqGuNQBw.js                 7.88 kB │ gzip:   2.45 kB
dist/assets/Register-BirYLdg8.js                       8.20 kB │ gzip:   3.24 kB
dist/assets/Login-rlhjJxHV.js                          9.79 kB │ gzip:   3.80 kB
dist/assets/AdminCourses-dcaOj1V0.js                   9.96 kB │ gzip:   3.34 kB
dist/assets/useGamification-B4yqmjaL.js               10.50 kB │ gzip:   4.05 kB
dist/assets/AdminEnrollments-BC7elafd.js              10.64 kB │ gzip:   3.29 kB
dist/assets/AdminCourseNew-CdjtzJId.js                10.89 kB │ gzip:   3.68 kB
dist/assets/AdminStudentDetail-Cn2rlbCN.js            12.29 kB │ gzip:   3.46 kB
dist/assets/homepageShowcaseService-B7TMFiAn.js       13.69 kB │ gzip:   5.61 kB
dist/assets/VocabPage-BFu8U_zw.js                     14.27 kB │ gzip:   4.01 kB
dist/assets/AdminCategories-BheOImHH.js               14.73 kB │ gzip:   4.73 kB
dist/assets/AdminMaterials-DvRrQ-pq.js                15.16 kB │ gzip:   4.73 kB
dist/assets/Combination-BmqmVLG-.js                   15.85 kB │ gzip:   6.00 kB
dist/assets/VocabLessonPage-BBrmSc9Q.js               18.54 kB │ gzip:   5.64 kB
dist/assets/StudentLayout-C0fLqfB6.js                 19.23 kB │ gzip:   5.59 kB
dist/assets/MyCoursesPage-CFANTcAc.js                 19.25 kB │ gzip:   5.83 kB
dist/assets/select-BUbnBk7f.js                        21.25 kB │ gzip:   7.40 kB
dist/assets/AdminFullTestManager-BZz_vMvY.js          22.88 kB │ gzip:   7.20 kB
dist/assets/AdminBackup-BLHG7pyk.js                   24.93 kB │ gzip:   7.63 kB
dist/assets/FullTestResult-B7w7nbBy.js                25.05 kB │ gzip:   7.30 kB
dist/assets/AdminGamesConfig-G5Sj92W7.js              25.47 kB │ gzip:   7.54 kB
dist/assets/QuizPage-BIuQHaWp.js                      25.93 kB │ gzip:   7.77 kB
dist/assets/QuizResult-CdsYg96b.js                    27.99 kB │ gzip:   7.83 kB
dist/assets/AdminVocabPacks-BUWDRTmR.js               37.48 kB │ gzip:   9.91 kB
dist/assets/GamesHub-BN0e-t0G.js                      37.66 kB │ gzip:   9.44 kB
dist/assets/AdminSettings-DiBVcA5X.js                 39.77 kB │ gzip:   8.79 kB
dist/assets/Profile-DUWUBdCZ.js                       40.64 kB │ gzip:  10.42 kB
dist/assets/LearnPage-DmPwZV3n.js                     40.82 kB │ gzip:  11.21 kB
dist/assets/UpgradeProModal-BYP6u5jk.js               41.34 kB │ gzip:  11.92 kB
dist/assets/AdminFullTestQuestions-dboLd-nu.js        43.64 kB │ gzip:   9.67 kB
dist/assets/WordShooterLeaderboardModal-D4ymH7cS.js   48.07 kB │ gzip:  12.76 kB
dist/assets/FullTestExam-CSZ2ARG9.js                  55.36 kB │ gzip:  14.18 kB
dist/assets/Index-yMtoAzsZ.js                         59.64 kB │ gzip:  15.42 kB
dist/assets/DashboardPage-BZ9qk6dl.js                 67.51 kB │ gzip:  15.22 kB
dist/assets/WordDefenseGame-C8lUbt-x.js               73.08 kB │ gzip:  18.41 kB
dist/assets/WordShooterGame-Dmhl-OzA.js               78.41 kB │ gzip:  21.34 kB
dist/assets/vendor-ui-DFkus0iB.js                     80.01 kB │ gzip:  18.41 kB
dist/assets/index-CQ3YvFgU.js                         96.70 kB │ gzip:  33.34 kB
dist/assets/DictationPage-C1d7Cp8w.js                110.40 kB │ gzip:  26.49 kB
dist/assets/vocabPacksService-CFq1wP5O.js            124.37 kB │ gzip:  39.89 kB
dist/assets/vendor-react-zEA-uSLV.js                 162.92 kB │ gzip:  53.16 kB
dist/assets/AdminCourseDetail-CX2B7Lkm.js            185.66 kB │ gzip:  50.20 kB
dist/assets/vendor-query-CH3OBSVQ.js                 234.42 kB │ gzip:  62.91 kB
dist/assets/Part2CoachPage-JzsxBHdb.js               338.88 kB │ gzip:  55.20 kB
dist/assets/vendor-charts-D4lgbj5e.js                399.38 kB │ gzip: 107.95 kB
dist/assets/SpeakingRoomsPage-V_FQ8PNh.js            651.43 kB │ gzip: 172.95 kB
✓ built in 27.99s
check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).
src/components/admin/LessonManager.tsx:306:        const { error } = await supabase.from("quizzes").update(payload).eq("id", editingQuiz.id);
src/components/admin/LessonManager.tsx:309:        const { error } = await supabase.from("quizzes").insert(payload);
src/components/admin/LessonManager.tsx:325:      const { error } = await supabase.from("quizzes").delete().eq("id", id);
src/components/admin/LessonManager.tsx:573:      const { data, error } = await supabase.from("quizzes").insert({
src/components/admin/LessonManager.tsx:580:      await supabase.from("lessons").update({ quiz_id: data.id }).eq("id", lessonId);
4269679 feat(admin): migrate course modules, lessons and practices to API (T-013)
b4f1bf7 docs: record T-012 review PASS, update queue
82c8e10 merge: T-012 catalog admin modules backend (review PASS)
 src/components/admin/LessonManager.tsx         |  40 ++--
 src/components/admin/LessonPracticeManager.tsx |  34 ++--
 src/components/admin/ModuleManager.tsx         |  37 ++--
 src/lib/api/catalog.test.ts                    | 195 ++++++++++++++++++-
 src/lib/api/catalog.ts                         | 137 +++++++++++++
 src/lib/api/learning.test.ts                   | 254 ++++++++++++++++++++++++-
 src/lib/api/learning.ts                        | 106 +++++++++++
 src/pages/admin/AdminCourseDetail.tsx          |   3 +-
 8 files changed, 736 insertions(+), 70 deletions(-)
```

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
**PASS** (Claude, 2026-10-28) — merge vào `refactor/nestjs-backend`. Review trên `9b5db61` (Antigravity làm trước khi QUEUE giao lại cho Claude; review kỹ thay vì làm lại).
- Đúng từng dòng bảng mục 3: bỏ tạo quiz và tính `display_order` ở client; giữ `.then(({ error }) => …)`, `setQueryData` lạc quan, popup luyện tập vẫn nuốt lỗi; adapter không gửi `display_order`/`course_id`/`module_id` trong body.
- Chạy lại sau gộp: vitest 121/121, eslint adapter sạch, lint 4 file không tăng (ModuleManager 24→19, LessonManager 27→23), `tsc` 0 lỗi ở file T-013, `check-ui-diff` OK, build OK.
- Còn lại (ngoài phạm vi, P3 admin quiz): Quiz CRUD độc lập trong `LessonManager.tsx:306-325, 573-580` vẫn ghi Supabase, gồm `lessons.update({ quiz_id })` ở `:580` — trên staging nút "tạo quiz cho bài" sẽ ghi sang DB cũ. Chuyển cùng task admin quiz/câu hỏi.
