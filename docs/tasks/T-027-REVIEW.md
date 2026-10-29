# Review T-027 (Claude, 2026-10-29) — 🔁 TRẢ LẠI

Review trên `8cb91fa`. Logic đúng: guard admin cấp class, `rename-folder`/`delete-folder` trong `$transaction`, quy tắc khớp thư mục và `replace` giống code cũ, thứ tự sắp xếp giữ đúng (theo khóa: `display_order`; toàn bộ: `created_at desc`), e2e 3 vai cho cả 5 route. Phải sửa 2 điểm rồi push lại cùng nhánh:

1. **Thiếu tầng repository** (AGENTS.md "controller → service → repository"). `MaterialsService` đang gọi `this.prisma.material.*`, `this.prisma.course/lesson/quiz.findUnique` trực tiếp.
   - Tạo `backend/src/modules/media/materials.repository.ts` chứa toàn bộ truy vấn Prisma (kể cả `inTransaction` cho rename/delete folder, theo mẫu `catalog-admin.repository.ts` / `assessment-admin.repository.ts`).
   - Tách `toDto` sang `materials.mapper.ts` như các module khác.
   - Kiểm tra khóa học/bài/quiz tồn tại: không import repository module khác; truy vấn `course/lesson/quiz` để trong `MaterialsRepository` (chỉ `findUnique … select: { id: true }`) là được.
   - Cập nhật unit spec theo mock repository.
2. **Giữ đúng cách xử lý lỗi cũ** (BRIEFS: "chỗ cũ bỏ qua lỗi thì vẫn bỏ qua"). Code cũ **không** kiểm `error` ở 3 chỗ, nay đã thêm `if (error) throw error;` → đổi hành vi (toast lỗi thay vì toast thành công):
   - `AdminCourseDetail.tsx` `deleteMaterialMutation` (cũ: `await supabase.from("materials").delete()…` không kiểm lỗi).
   - `AdminMaterials.tsx` `renameFolderMutation` và `deleteFolderMutation` (cũ: lỗi từng lệnh bị bỏ qua).
   → Gọi `await deleteAdminMaterial(matId);` / `await renameAdminMaterialFolder(...)` / `await deleteAdminMaterialFolder(...)` **không** throw. Giữ `if (error) throw error;` ở chỗ cũ có kiểm (`deleteMutation`, `addMaterialMutation`, upload `insertErr`).

Sau khi sửa: chạy lại toàn bộ lệnh kiểm tra (kể cả `tsc` cho `src/lib/api/media.ts` và 4 file trang), dán output nguyên văn **sau commit cuối**, push lại `task/T-027-materials`, đổi QUEUE về 🔍.
