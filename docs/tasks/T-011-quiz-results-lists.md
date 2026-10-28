# T-011: Danh sách kết quả quiz qua API (Learn, Dashboard, Hồ sơ, admin)

> **Người làm**: Antigravity · **Module**: Assessment · **Nhánh**: `task/T-011-quiz-results-lists` (tách từ `refactor/nestjs-backend` mới nhất)
> **Phụ thuộc**: không (T-010 có thể chưa merge: nếu đụng `AdminStudentDetail.tsx` thì chỉ sửa đúng chỗ ở mục 3) · **Ước lượng**: 2 giờ
> Đọc trước: `AGENTS.md`, code `backend/src/modules/assessment/` (làm theo đúng cấu trúc ở đó), `src/lib/api/assessment.ts`, file này.

## 1. Mục tiêu
Sau P3 lõi, `QuizPage` ghi kết quả qua API (DB mới) nhưng 4 trang vẫn đọc `user_quiz_results` từ Supabase → không thấy kết quả mới. Thêm 2 endpoint đọc và chuyển 4 truy vấn.

## 2. Phạm vi
**Được sửa/tạo**: `backend/src/modules/assessment/**` (thêm method/route/DTO, không đổi route cũ), `backend/test/assessment-results.e2e-spec.ts` (mới), `src/lib/api/assessment.ts` + `.test.ts` (thêm hàm), và **chỉ thân `queryFn` + `import`** ở 4 chỗ mục 3.
**Cấm**: JSX, `className`, câu chữ, `queryKey`; `DashboardPage.tsx:317` (bảng xếp hạng — Gamification); `DictationPage.tsx` (task Dictation); module khác.

## 3. Hành vi cũ → mới
| PARITY | Chỗ cũ | Truy vấn cũ | Thay bằng |
|---|---|---|---|
| ASM-006 (đọc) | `LearnPage.tsx:100-112` | `select quiz_id, score, correct_answers, total_questions` · `user_id = me` · order `completed_at` desc | `listMyQuizResults()` |
| ASM-006 (đọc) | `DashboardPage.tsx:181-191` | `select id, quiz_id, score, total_questions, correct_answers, time_spent_seconds, completed_at` · như trên | `listMyQuizResults()` |
| ASM-006 (đọc) | `Profile.tsx:227-237` | `select *, quizzes(id, title, audio_url, total_questions, module_id, modules(id, title, courses(id, title)))` · như trên | `listMyQuizResults()` |
| ADM-003 | `AdminStudentDetail.tsx:59-70` | `select *, quizzes(title)` · `user_id = :userId` · order `completed_at` desc | `listUserQuizResults(userId!)` |

Thân `queryFn` mới giữ `if (!user) return [];` (nếu có) và `return data ?? []` / `data || []` như cũ; **không ném lỗi** (cũ không ném).

## 4. Đặc tả
| Method | Route | Guard | Trả về |
|---|---|---|---|
| GET | `/api/v1/assessment/results/me` | JWT | `QuizResultWithQuizDto[]` của chính mình |
| GET | `/api/v1/assessment/admin/users/:userId/results` | JWT + `RolesGuard` + `@Roles(AppRole.admin)` (`ParseUUIDPipe`) | `QuizResultWithQuizDto[]` của user đó |

- `QuizResultWithQuizDto` = `QuizResultDto` (đã có) + `quizzes: { id, title, audio_url, total_questions, module_id, modules: { id, title, courses: { id, title } | null } | null } | null`. Một shape cho cả 4 chỗ (chỗ cũ chọn ít cột hơn vẫn đọc đúng). Tên khóa `quizzes`/`modules`/`courses` giữ như PostgREST.
- Sắp `completed_at` desc **nulls last**, rồi `id` desc.
- Join `quizzes → modules → courses` chỉ đọc bằng `include`/`select` trong `AssessmentRepository` (bảng của Catalog; ghi chú lý do trong code như T-009).
- `user_id` của `/me` **chỉ** từ token. Route `/me` phải khai báo **trước** `results/:resultId` trong controller (tránh `ParseIntPipe` bắt `"me"` → 400).
- RLS cũ → test e2e: `Users view own results` (A không thấy kết quả B qua `/me`), `Admins view all results` (admin đọc được của B; học viên gọi route admin → 403; không token → 401).

## 5. Tiêu chí nghiệm thu
- [ ] 2 route đúng mục 4; e2e phân quyền đủ 3 vai
- [ ] E2E: thứ tự `completed_at` desc; `quizzes.modules.courses.title` đúng khi quiz có module; quiz không module → `quizzes.modules = null`; `score` là number
- [ ] Unit mapper cho DTO mới; adapter test: đúng URL, lỗi trả `{ data: null, error }` không ném
- [ ] `grep -n 'from("user_quiz_results")' src/pages/LearnPage.tsx src/pages/Profile.tsx src/pages/admin/AdminStudentDetail.tsx` rỗng; `DashboardPage.tsx` chỉ còn dòng `:317`
- [ ] `check-ui-diff` OK; số `queryKey` mỗi trang không đổi

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -n 'from("user_quiz_results")' src/pages/LearnPage.tsx src/pages/DashboardPage.tsx src/pages/Profile.tsx src/pages/admin/AdminStudentDetail.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```
Không sửa `docs/PARITY.md`, `docs/PROGRESS.md`.

## 7. Kết quả (người làm điền)

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
