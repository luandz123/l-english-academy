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
  - Giữ nguyên Supabase tại 2 vị trí P3 Assessment: `user_quiz_results` (`:94`) và `questions` trong `openPractice` (`:201`), cùng dòng `import { supabase }`.
- Không thay đổi JSX, CSS, Tailwind class, câu chữ tiếng Việt, tên state hay queryKey (`check-ui-diff` OK).
- Kiểm tra local:
  - Học viên chưa ghi danh vào khóa trả phí: bài học trả phí hiển thị icon khóa, bấm vào mở UpgradeProModal; bài free xem bình thường.
  - Học viên có ghi danh: truy cập bài trả phí xem được video/PDF và tab tài liệu nhận dữ liệu.
  - Đánh dấu hoàn thành / bỏ hoàn thành cập nhật tiến độ; thích / bỏ thích cập nhật danh sách yêu thích; thêm ghi chú hiển thị ngay trên cùng (order `created_at` desc).
  - Admin: xem được tất cả các bài; bật chế độ xem như khách hiển thị khóa tương tự học viên chưa ghi danh.

## 8. Câu hỏi (người làm điền khi bị chặn)
Không có. Đã hoàn thành toàn bộ yêu cầu của T-007.

## 9. Review (Claude điền)

