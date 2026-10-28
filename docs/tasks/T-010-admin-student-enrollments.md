# T-010: Ghi danh ở trang chi tiết học viên (admin) qua API

> **Người làm**: Antigravity · **Module**: Learning · **Nhánh**: `task/T-010-admin-student-enrollments` (tách từ `refactor/nestjs-backend` **sau khi `git pull`**)
> **Phụ thuộc**: T-009 đã merge · **Ước lượng**: 1,5 giờ
> Đọc trước: `AGENTS.md`, `T-009-learning-admin.md` (mục 4.3, 9, 10), `src/lib/api/learning.ts`, `src/lib/errorHandler.ts`, file này. Gặp gì không rõ: **dừng và ghi vào mục 8**.

## 0. Bắt đầu
```bash
git fetch && git checkout refactor/nestjs-backend && git pull
git checkout -b task/T-010-admin-student-enrollments
```

## 1. Mục tiêu
Chuyển 3 thao tác ghi danh ở `src/pages/admin/AdminStudentDetail.tsx` sang endpoint T-009: đọc, mở khóa, thu hồi. Đồng thời đổi `expires_in_days` ở backend thành **bắt buộc** (góp ý review T-009).

## 2. Phạm vi
**Được sửa/tạo**
- `backend/src/modules/learning/dto/admin-enrollment.dto.ts` — chỉ `CreateAdminEnrollmentDto.expires_in_days` (mục 4.1)
- `backend/test/learning-admin.e2e-spec.ts` — thêm test mục 4.1
- `src/lib/api/learning.ts` — **thêm** 3 hàm (mục 4.2), không đổi hàm cũ
- `src/lib/api/learning.test.ts` — thêm test
- `src/pages/admin/AdminStudentDetail.tsx` — **chỉ** thân `queryFn` của `admin-student-enrollments`, thân `mutationFn` của `unlockCourseMutation` và `removeEnrollmentMutation`, dòng `import`

**Cấm sửa**: JSX, `className`, câu chữ, `queryKey`, `onSuccess`/`onError`; 4 query còn lại của trang (`profiles`, `user_quiz_results`, `admin_student_notes`, `courses`) và `addNoteMutation` — thuộc task khác, giữ Supabase; module khác.

## 3. Hành vi cũ → mới
| PARITY | Chỗ cũ | Cũ | Mới |
|---|---|---|---|
| ADM-005 | `AdminStudentDetail.tsx:50-57` | `enrollments.select("*, courses(title)").eq("user_id", userId)`; lỗi bị bỏ qua → `[]` | `listUserEnrollments(userId!)` → `data ?? []` (không ném, như cũ) |
| ADM-005 | `AdminStudentDetail.tsx:109-120` | client tính `expires_at = now + expiryDays ngày` hoặc `null` rồi `insert`; lỗi → `throw` → toast `getFriendlyErrorMessage(err)` | `addUserEnrollment(userId!, Number(selectedCourseId), expiryDays === "unlimited" ? null : Number(expiryDays))`; có `error` → `throw error`. **Không** tính `expires_at` ở client (luật 5) |
| ADM-005 | `AdminStudentDetail.tsx:130-134` | `enrollments.delete().eq("id", enrollmentId)`; lỗi → `throw` | `removeEnrollment(enrollmentId)`; có `error` → `throw error` |

Thân `mutationFn` mở khóa mới (giữ nguyên tên biến state):
```ts
const { error } = await addUserEnrollment(
  userId!,
  Number(selectedCourseId),
  expiryDays === "unlimited" ? null : Number(expiryDays),
);
if (error) throw error;
```

## 4. Đặc tả
### 4.1 Backend: `expires_in_days` bắt buộc
Hiện `@IsOptional()` → bỏ trống trường bị hiểu là **vĩnh viễn**. Đổi thành: bỏ `@IsOptional()`, thêm `@ValidateIf((o: CreateAdminEnrollmentDto) => o.expires_in_days !== null)` trước `@IsInt() @Min(1) @Max(3650)`; Swagger `@ApiProperty({ nullable: true, ... })` (không còn `Optional`). Kết quả:
- `{ course_id, expires_in_days: 30 }` → hạn 30 ngày; `{ course_id, expires_in_days: null }` → vĩnh viễn (như cũ)
- `{ course_id }` (thiếu trường) → 400 `VALIDATION_FAILED`
- Service giữ nguyên.

### 4.2 Adapter `src/lib/api/learning.ts`
| Hàm | Gọi | Trả về |
|---|---|---|
| `listUserEnrollments(userId)` | GET `learning/admin/users/:userId/enrollments` | `AdminEnrollmentRow[]` |
| `addUserEnrollment(userId, courseId, expiresInDays)` | POST `learning/admin/users/:userId/enrollments` body `{ course_id, expires_in_days }` (**luôn** có `expires_in_days`, kể cả `null`) | `AdminEnrollmentRow` |
| `removeEnrollment(enrollmentId)` | DELETE `learning/admin/enrollments/:id` | `null` |

- `AdminEnrollmentRow` = `EnrollmentRow` (đã có) + `courses: { title: string } | null`.
- Mọi hàm trả `{ data, error }`, không ném.
- `addUserEnrollment`: lỗi `code === "ENROLLMENT_EXISTS"` → trả `error = new ApiError(409, "23505", <message gốc>)` để `getFriendlyErrorMessage` (`errorHandler.ts:46`) ra đúng câu cũ "Dữ liệu này đã tồn tại…". Lỗi khác trả nguyên.

## 5. Tiêu chí nghiệm thu
- [ ] `grep -n 'from("enrollments")' src/pages/admin/AdminStudentDetail.tsx` không còn kết quả (dán output)
- [ ] `git diff refactor/nestjs-backend -- src/pages/admin/AdminStudentDetail.tsx` chỉ đổi `import` và thân 1 `queryFn` + 2 `mutationFn`; `check-ui-diff` OK; số `queryKey` trước/sau bằng nhau
- [ ] `learning.test.ts`: 3 hàm gọi đúng method/URL/body; `addUserEnrollment(…, null)` gửi `"expires_in_days": null` (không bỏ khóa); `ENROLLMENT_EXISTS` → `error.code === "23505"` và `getFriendlyErrorMessage(error)` ra câu trùng lặp; 500 → error nguyên; không hàm nào ném
- [ ] E2E backend: thiếu `expires_in_days` → 400; `null` → `expires_at null`; 30 → hạn 30 ngày (test cũ vẫn pass)
- [ ] Chạy tay local (backend + `npm run dev`, tài khoản admin test trong `.env`/seed): mở `/admin/students/:id` của một học viên test → mở khóa 1 khóa 30 ngày → bảng hiện ngày hết hạn đúng; mở khóa "Vĩnh viễn" → hiện "Vĩnh viễn"; khóa đã mở biến khỏi danh sách chọn; thu hồi → dòng biến mất; ghi kết quả vào mục 7

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
npx eslint src/lib/api/learning.ts src/lib/api/learning.test.ts
grep -n 'from("enrollments")' src/pages/admin/AdminStudentDetail.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```
Không sửa `docs/PARITY.md`, `docs/PROGRESS.md` — Claude cập nhật khi review.

## 7. Kết quả (người làm điền)

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
