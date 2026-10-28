# T-017: Danh sách đề Full Test và kết quả Full Test của tôi qua API

> **Người làm**: Antigravity · **Module**: Assessment · **Nhánh**: `task/T-017-full-test-lists`
> **Phụ thuộc**: **T-011 ✅ merged** (cùng sửa `DashboardPage.tsx`, `Profile.tsx`, `assessment.*`) · **Ước lượng**: 1,5 giờ
> Đọc trước: `AGENTS.md`, `backend/src/modules/assessment/full-test.*` (Claude viết — **thêm** route vào `full-test.controller.ts`/`full-test.service.ts`/`full-test.repository.ts`, không đổi route cũ), `src/lib/api/fullTest.ts`, file này.

## 1. Mục tiêu
Full Test đã ghi kết quả qua API (DB mới) nhưng danh sách đề và 3 chỗ đọc kết quả vẫn ở Supabase.

## 2. Phạm vi
**Được sửa/tạo**: `backend/src/modules/assessment/full-test.*` + `dto/full-test.dto.ts` (thêm), `backend/test/assessment-full-test-lists.e2e-spec.ts` (mới), `src/lib/api/fullTest.ts` + `.test.ts` (thêm hàm), **chỉ** thân `queryFn` + `import` ở 4 chỗ mục 3.
**Cấm**: JSX, câu chữ, `queryKey`; `DashboardPage.tsx:312-330` (bảng xếp hạng thời gian học của mọi người — để riêng); `AdminBackup.tsx`; `FullTestExam.tsx`, `FullTestResult.tsx`.

## 3. Hành vi cũ → mới
| PARITY | Chỗ cũ | Truy vấn cũ | Thay bằng |
|---|---|---|---|
| ASM-009 | `FullTestList.tsx:16-28` | `full_tests.select("*").eq("course_id", cid).order("category").order("display_order")`; lỗi → `throw` | `listCourseFullTests(cid)`; có `error` → `throw error` |
| ASM-016 (đọc) | `FullTestList.tsx:30-41` | `user_full_test_results.select("test_id, total_score")` · `user_id = me` · order `total_score` desc | `listMyFullTestResults()` → `data || []` |
| ASM-016 (đọc) | `DashboardPage.tsx:195-207` | `select("*, full_tests(*)")` · order `completed_at` desc | `listMyFullTestResults()` |
| ASM-016 (đọc) | `Profile.tsx:245-257` | `select("*, full_tests(id, title, total_questions)")` · như trên | `listMyFullTestResults()` |

`FullTestList` chọn điểm cao nhất mỗi đề bằng `resultMap` ở client nên thứ tự server trả không ảnh hưởng.

## 4. Đặc tả
| Method | Route | Guard | Trả về |
|---|---|---|---|
| GET | `/api/v1/assessment/courses/:courseId/full-tests` | không (RLS cũ công khai) | `FullTestDto[]` order `category`, `display_order`, `id` |
| GET | `/api/v1/assessment/full-test-results/me` | JWT | `FullTestResultWithTestDto[]` của chính mình, order `completed_at` desc nulls last, `id` desc |

- `FullTestResultWithTestDto` = `FullTestResultDto` + `full_tests: FullTestDto | null` (tên khóa `full_tests` như PostgREST).
- Route `full-test-results/me` khai báo **trước** `full-test-results/:resultId` (tránh `ParseIntPipe` bắt `"me"`).
- RLS `Users view own full test results`: A không thấy kết quả của B (e2e).

## 5. Tiêu chí nghiệm thu
- [ ] E2E: danh sách đề đúng thứ tự, khóa khác không lẫn; `/me` chỉ của mình, kèm `full_tests.title`; không token → 401
- [ ] Adapter test đúng URL, lỗi không ném
- [ ] `grep -n 'from("full_tests")\|from("user_full_test_results")' src/pages/FullTestList.tsx src/pages/Profile.tsx` rỗng; `DashboardPage.tsx` chỉ còn dòng `:316`; `check-ui-diff` OK

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -n 'from("full_tests")\|from("user_full_test_results")' src/pages/FullTestList.tsx src/pages/DashboardPage.tsx src/pages/Profile.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
