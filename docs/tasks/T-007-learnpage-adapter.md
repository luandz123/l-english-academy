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
- [ ] `grep -n "supabase" src/pages/LearnPage.tsx` chỉ còn: dòng `import`, `user_quiz_results`, `questions` trong `openPractice` (dán output vào mục 7)
- [ ] `learning.test.ts`: mỗi hàm gọi đúng method + đường dẫn + body; `getMyEnrollment` bóc đúng `null` và bản ghi; lỗi 401/500 trả về `error`, không ném
- [ ] `node scripts/check-ui-diff.mjs refactor/nestjs-backend` OK; `git diff refactor/nestjs-backend -- src/pages/LearnPage.tsx` không có dòng JSX/`className`/`queryKey`
- [ ] Chạy tay local (backend + `npm run dev`, tài khoản test trong `.env`), ghi kết quả vào mục 7:
  - [ ] học viên **chưa** ghi danh khóa trả phí: bài trả phí hiện khóa + bấm mở modal nâng cấp; bài free xem được video
  - [ ] học viên có ghi danh (thêm dòng `enrollments` bằng SQL local): xem được video/PDF bài trả phí, tab tài liệu có dữ liệu
  - [ ] đánh dấu hoàn thành / bỏ hoàn thành, F5 vẫn giữ; thích / bỏ thích; thêm ghi chú hiện ngay, mới nhất trên cùng
  - [ ] admin: thấy đủ; bật "xem như khách" thấy khóa như cũ
- [ ] Không đổi `queryKey` nào (đếm `queryKey` trước/sau bằng nhau)

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7
```bash
npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
npx eslint src/lib/api/learning.ts src/lib/api/learning.test.ts
grep -n "supabase" src/pages/LearnPage.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)

## 8. Câu hỏi (người làm điền khi bị chặn)

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
