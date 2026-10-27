# T-005: LearningModule — quyền xem bài trả phí, cây bài học, ghi danh, tài liệu bài (backend)

> **Người làm**: Claude · **Module**: Learning (+ tối thiểu Auth: guard tùy chọn) · **Nhánh**: `task/T-005-learning-access` (tách từ `refactor/nestjs-backend`)
> **Phụ thuộc**: P1 Auth đã merge · **Ước lượng**: 3–4 giờ
> Là **mẫu** cho T-006/T-007: các file của LearningModule tạo ở đây, T-006 chỉ thêm vào.

## 1. Mục tiêu
Đưa quyết định "học viên này có được xem nội dung bài này không" lên server. Hiện tại quyết định nằm hoàn toàn ở client (`LearnPage.tsx:219-224`), còn bảng `lessons` và `materials` đọc được bởi bất kỳ ai (RLS `USING (true)`) → `video_url`, `pdf_url`, `file_url` của bài trả phí lộ cho cả người chưa đăng nhập. Đây là sửa lỗ hổng theo D-02, **không đổi giao diện**: nhánh khóa bài (`LearnPage.tsx:466`) không đọc các trường này.

## 2. Phạm vi
**Được tạo/sửa**
- `backend/src/modules/auth/guards/optional-jwt-auth.guard.ts` (+ `.spec.ts`), export ở `auth.module.ts` — **sửa module Auth tối thiểu**, ghi rõ ở commit
- `backend/src/modules/learning/` — `learning.module.ts`, `learning.controller.ts`, `learning.service.ts`, `learning.repository.ts`, `learning.mapper.ts`, `lesson-access.ts` (hàm thuần), `dto/*`, `*.spec.ts`
- `backend/src/modules/catalog/catalog.service.ts` — thêm `findCourseById(id): Promise<CourseDto | null>` nếu cần (không đổi `getCourseById`)
- `backend/test/learning-access.e2e-spec.ts`
- `backend/src/app.module.ts` — thêm `LearningModule`

**Cấm sửa**: mọi file frontend; `schema.prisma`, migration; hành vi endpoint đã có.

## 3. Hành vi cũ (nguồn sự thật)
| PARITY | Chỗ dùng cũ | Truy vấn Supabase |
|---|---|---|
| LRN-001 | `LearnPage.tsx:49-66` | `modules` · `select *, lessons(*)` · `course_id = cId` · order `display_order`; client bỏ module/bài `is_published === false`, sắp bài theo `display_order` |
| LRN-004 | `LearnPage.tsx:29-39` | `enrollments` · `select *` · `user_id`, `course_id` · `maybeSingle()`; admin không gọi (client tự trả bản ghi giả) |
| LRN-005 | `LearnPage.tsx:116-126` | `materials` · `select *` · `lesson_id` · order `display_order` |
| — | `LearnPage.tsx:219-224`, `:894` | Quyền học: `enrollment ‖ course.is_free ‖ module.is_free ‖ lesson.is_free` (admin có enrollment giả) |

**Policy RLS → kiểm tra mới (mỗi dòng 1 test e2e)**
- `Modules viewable by all`, `Lessons viewable by all` — đọc công khai → giữ: curriculum không cần đăng nhập. **Thay đổi có chủ đích**: nội dung (`video_url`, `pdf_url`) chỉ trả khi `canStudyLesson`.
- `Users view own enrollments` — chỉ thấy ghi danh của mình → endpoint lấy `user_id` từ token, không nhận từ client.
- `Admins manage enrollments` — admin đọc được mọi thứ → admin luôn thấy đủ nội dung.
- `Users enroll themselves` (INSERT với `user_id = auth.uid()`) — **không tạo endpoint**. Không có code học viên nào dùng (chỉ `AdminStudentDetail.tsx:112` của admin và RPC thanh toán); để nguyên là lỗ hổng tự ghi danh khóa trả phí. Ghi PARITY là "đóng có chủ đích (D-02)".

## 4. Đặc tả
**`canStudyLesson(ctx)`** (`lesson-access.ts`, hàm thuần, unit test bảng chân trị):
`isAdmin || enrolled || courseIsFree || moduleIsFree || lessonIsFree`. `enrolled` = có dòng `enrollments(user, course)`, **bỏ qua `expires_at`** như client cũ (OPEN_QUESTIONS #18 — đổi quy tắc chỉ sửa đúng hàm này). Khách (không token): chỉ 3 cờ free. Bài không có module → `moduleIsFree = false`, course không xác định → `enrolled = courseIsFree = false`.

**`OptionalJwtAuthGuard`**: không có header `Authorization` → `req.user = undefined`, cho qua. **Có header mà token sai/hết hạn → 401 như `JwtAuthGuard`** (để `apiClient` refresh; nếu coi là khách thì học viên đã trả tiền nhận URL rỗng và bị cache 5 phút).

| Method | Route | Guard | Trả về |
|---|---|---|---|
| GET | `/learning/courses/:courseId/curriculum` | Optional | `CurriculumModuleDto[]` — module + `lessons: LessonDto[]` |
| GET | `/learning/courses/:courseId/enrollment` | JWT | `{ enrollment: EnrollmentDto \| null }` |
| GET | `/learning/lessons/:lessonId/materials` | Optional | `MaterialDto[]` |

Quy ước:
- `curriculum`: module order `display_order` asc, `id` asc; lessons order `display_order` asc, `id` asc. Không phải admin → bỏ module/bài có `is_published = false` (client cũng bỏ, nên không lộ ra giao diện). Bài không được học → `video_url = null`, `pdf_url = null`, các trường khác giữ (sidebar cần `title`, `is_free`, `lesson_type`, `duration_seconds`, `quiz_id`). Khóa không tồn tại → `[]` (Supabase cũ trả `[]`), không 404.
- `materials`: order `display_order` asc, `id` asc. Bài không tồn tại hoặc không được học → `[]` (không 403: tab tài liệu chỉ hiện khi được học, trả lỗi sẽ sinh trạng thái lỗi mới).
- `enrollment`: bọc trong object vì Nest trả body rỗng cho `null`. Adapter T-007 bóc ra.
- `course.is_free` lấy qua `CatalogService` (không đọc bảng `courses` trong LearningRepository). `modules`+`lessons` do LearningRepository đọc (cây bài là dữ liệu học; ghi `modules` vẫn thuộc Catalog).
- Shape snake_case đúng cột DB; `Date` → ISO; giữ `null`. Mapper riêng. `ParseIntPipe` cho id → sai kiểu 400.
- Một truy vấn cho cây bài (`include lessons`), một cho enrollment, một cho course — không N+1.

## 5. Tiêu chí nghiệm thu
- [ ] Unit `canStudyLesson`: đủ 5 nguồn quyền + khách + bài không module
- [ ] Unit `OptionalJwtAuthGuard`: không header → qua, `req.user` undefined; token hỏng → 401 `bad_jwt`; hết hạn → `JWT expired`
- [ ] E2E curriculum: khách thấy bài free có URL, bài trả phí `video_url/pdf_url = null`; học viên có enrollment thấy đủ; học viên khác khóa thấy `null`; admin thấy đủ + cả bài/module `is_published=false`; học viên không thấy bài `is_published=false`; `course.is_free` mở toàn khóa; `module.is_free` mở cả module; khóa không tồn tại → `[]`; token hỏng → 401
- [ ] E2E enrollment: không token → 401; trả đúng bản ghi của mình; **không** đọc được của người khác (không có tham số user)
- [ ] E2E materials: khách/không ghi danh → `[]` với bài trả phí; được học → đủ, đúng thứ tự
- [ ] Không có route POST enrollment cho học viên
- [ ] Swagger đủ; DoD AGENTS.md

## 6. Lệnh kiểm tra
```bash
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
```

## 7. Kết quả

## 8. Câu hỏi

## 9. Review
