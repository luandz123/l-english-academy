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
- [ ] `grep -nE 'from\("(modules|lessons|lesson_practices)"\)' src/pages/admin/AdminCourseDetail.tsx src/components/admin/ModuleManager.tsx src/components/admin/LessonManager.tsx src/components/admin/LessonPracticeManager.tsx` rỗng (dán output); `from("quizzes")` chỉ còn ở Quiz CRUD độc lập
- [ ] Adapter test: mỗi hàm đúng method/URL/body; không gửi `display_order`, `course_id`, `module_id` trong body; lỗi không ném
- [ ] `check-ui-diff` OK; số `queryKey` mỗi file không đổi
- [ ] Chạy tay local bằng tài khoản admin test: tạo/sửa/xóa chương; bật/tắt free, ẩn/hiện; kéo thả chương và bài; "cấu hình 1 chạm"; tạo bài video và bài `exam` (bài exam có quiz tự tạo); popup luyện tập thêm/sửa/xóa; F5 vẫn giữ. Ghi kết quả vào mục 7

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
npx eslint src/lib/api/catalog.ts src/lib/api/catalog.test.ts src/lib/api/learning.ts src/lib/api/learning.test.ts
grep -nE 'from\("(modules|lessons|lesson_practices|quizzes)"\)' src/pages/admin/AdminCourseDetail.tsx src/components/admin/ModuleManager.tsx src/components/admin/LessonManager.tsx src/components/admin/LessonPracticeManager.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
