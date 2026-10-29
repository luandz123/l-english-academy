# T-027: Thư viện tài liệu (materials)

> **Người làm**: Antigravity · **Module**: `MediaModule` · **Nhánh**: `task/T-027-materials` (tách từ `origin/refactor/nestjs-backend`)
> **Phụ thuộc**: T-026 (đã merged) · **Ước lượng**: 3 giờ
> Đọc trước: `AGENTS.md`, `docs/tasks/BRIEFS.md`, `docs/HLD.md`. Gặp gì không rõ: **dừng và ghi vào mục "Câu hỏi"**, không tự đoán.

## 1. Mục tiêu
Thay thế toàn bộ các thao tác truy vấn trực tiếp bảng `materials` từ Supabase trong `AdminMaterials.tsx`, `ImportDialog.tsx`, `AdminCourseDetail.tsx` và `QuizManager.tsx` bằng bộ endpoint RESTful NestJS tại `/api/v1/admin/materials` trong `MediaModule`.
**Lý do chọn MediaModule**: Bảng `materials` là danh mục lưu trữ tệp tin/tài liệu của hệ thống gắn liền với bucket `materials`. Việc đặt CRUD materials trong `MediaModule` giúp gom toàn bộ nghiệp vụ tệp tin, lưu trữ, upload và quản lý thư mục vào một module duy nhất, tránh phân mảnh logic sang `LearningModule`.

## 2. Phạm vi
**Được tạo/sửa**
- `backend/src/modules/media/dto/material.dto.ts` — DTO cho CRUD tài liệu: `AdminMaterialDto`, `CreateMaterialDto`, `RenameFolderDto`, `DeleteFolderDto`
- `backend/src/modules/media/dto/index.ts` — export các DTO mới
- `backend/src/modules/media/materials-admin.controller.ts` — controller admin cho tài liệu (`@Controller('admin/materials')`)
- `backend/src/modules/media/materials.service.ts` — service xử lý logic CRUD materials và transaction thư mục
- `backend/src/modules/media/media.module.ts` — đăng ký controller và service mới
- `backend/src/modules/media/materials.service.spec.ts` — unit tests cho materials service
- `backend/test/materials-admin.e2e-spec.ts` — e2e test 3 vai (401/403/200/201/204) và parent-child validation
- `src/lib/api/media.ts` — thêm các hàm API client cho admin materials
- `src/lib/api/media.test.ts` — unit tests cho các hàm API client mới
- `src/pages/admin/AdminMaterials.tsx` — chuyển các thao tác `materials` sang API client
- `src/components/admin/ImportDialog.tsx` — chuyển insert `materials` sang API client
- `src/pages/admin/AdminCourseDetail.tsx` — chuyển CRUD materials theo khóa học sang API client
- `src/components/admin/QuizManager.tsx` — chuyển query & insert materials sang API client
- `docs/tasks/T-027-materials.md` — spec task này
- `docs/tasks/QUEUE.md` — cập nhật trạng thái

**Cấm sửa**
- JSX, `className`, chuỗi hiển thị, `queryKey`, tên state trong mọi file `.tsx`
- Không sửa layout, CSS hoặc cấu trúc component

## 3. Hành vi cũ cần giữ (nguồn sự thật)
| Chỗ dùng cũ | Truy vấn Supabase | Kết quả component mong đợi |
|---|---|---|
| `AdminMaterials.tsx:41-47` | `supabase.from("materials").select("*, courses(title)").order("created_at", { ascending: false })` | Danh sách tài liệu kèm `courses: { title }`, sắp xếp `created_at desc` |
| `AdminMaterials.tsx:52` | `supabase.from("materials").delete().eq("id", id)` | Xóa 1 tài liệu theo ID |
| `AdminMaterials.tsx:66-74` | Đọc toàn bộ `materials`, lọc `fp === oldPath || fp.startsWith(oldPath + "/")` rồi update từng dòng `folder_path` | Đổi tên thư mục và cập nhật đường dẫn con |
| `AdminMaterials.tsx:88-100` | Đọc toàn bộ `materials`, lọc `fp === folderPath || fp.startsWith(folderPath + "/")` rồi xóa | Xóa thư mục và toàn bộ tệp bên trong |
| `AdminMaterials.tsx:147` | `supabase.from("materials").insert({ title, file_url, file_type, folder_path })` | Thêm tài liệu mới vào thư mục |
| `ImportDialog.tsx:65` | `supabase.from("materials").insert({ title, file_url, file_type, folder_path, quiz_id, course_id })` | Ghi nhận tài liệu sau khi tải file quiz media |
| `AdminCourseDetail.tsx:178` | `supabase.from("materials").select("*").eq("course_id", id).order("display_order")` | Danh sách tài liệu của khóa học, sắp xếp `display_order asc` |
| `AdminCourseDetail.tsx:191` | `supabase.from("materials").insert({ course_id, title, file_url, file_type, display_order })` | Thêm tài liệu cho khóa học |
| `AdminCourseDetail.tsx:210` | `supabase.from("materials").delete().eq("id", matId)` | Xóa tài liệu khỏi khóa học |
| `QuizManager.tsx:171` | `supabase.from("materials").select("*").order("created_at", { ascending: false })` | Danh sách tất cả tài liệu để chọn media |
| `QuizManager.tsx:242` | `supabase.from("materials").insert({ title, file_url, file_type, folder_path, quiz_id, course_id })` | Tự động ghi tài liệu sau upload |

**Policy RLS tương ứng**:
- `Materials viewable by all`: SELECT cho mọi người (`USING (true)`)
- `Admins manage materials`: ALL cho admin (`USING (has_role(auth.uid(), 'admin'))`)
- Ở backend: Tất cả các route `/admin/materials` được bảo vệ bằng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles('admin')`.

## 4. Đặc tả
### 4.1 Endpoints
Tất cả endpoint dưới tiền tố `/api/v1/admin/materials`, yêu cầu quyền `admin`.
- `GET /api/v1/admin/materials`
  - Query: `course_id?: number`, `folder_path?: string`
  - Nếu có `course_id`: lọc theo `courseId`, sắp xếp `displayOrder asc, id asc` (như `AdminCourseDetail.tsx`).
  - Nếu không có `course_id`: sắp xếp `createdAt desc, id desc` (như `AdminMaterials.tsx`, `QuizManager.tsx`).
  - Include relation `course: { select: { title: true } }` map thành `courses: { title: string } | null`.
  - Trả về: `AdminMaterialDto[]`.
- `POST /api/v1/admin/materials`
  - Body: `CreateMaterialDto`
    - `title`: string (NotEmpty, MaxLength 255)
    - `file_url`: string (NotEmpty, MaxLength 1000)
    - `file_type`: optional string (default "pdf", MaxLength 50)
    - `folder_path`: optional string (default "/", MaxLength 500)
    - `course_id`: optional number
    - `lesson_id`: optional number
    - `quiz_id`: optional number
    - `display_order`: optional number (default 0)
  - Kiểm tra quan hệ cha: nếu có `course_id`/`lesson_id`/`quiz_id`, kiểm tra đối tượng tồn tại. Nếu không → 400 `*_NOT_FOUND`.
  - Trả về: `AdminMaterialDto` (201 Created).
- `DELETE /api/v1/admin/materials/:id`
  - Param: `id` (ParseIntPipe)
  - Nếu không tìm thấy: 404 `MATERIAL_NOT_FOUND`.
  - Xóa dòng trong DB. Trả về 204 No Content.
- `POST /api/v1/admin/materials/rename-folder`
  - Body: `RenameFolderDto`
    - `old_path`: string (NotEmpty, MaxLength 500)
    - `new_path`: string (NotEmpty, MaxLength 500)
  - Thực thi trong **một `$transaction`**: tìm tất cả bản ghi có `folderPath === oldPath` hoặc `folderPath.startsWith(oldPath + '/')`, cập nhật tiền tố đường dẫn sang `newPath`.
  - Trả về: `{ count: number }` (200 OK).
- `POST /api/v1/admin/materials/delete-folder`
  - Body: `DeleteFolderDto`
    - `folder_path`: string (NotEmpty, MaxLength 500)
  - Thực thi trong **một `$transaction`**: tìm tất cả bản ghi có `folderPath === folderPath` hoặc `folderPath.startsWith(folderPath + '/')`, xóa toàn bộ.
  - Trả về: `{ count: number }` (200 OK).

### 4.2 DTOs
```ts
export class MaterialCourseDto {
  @ApiProperty()
  title!: string;
}

export class AdminMaterialDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true }) lesson_id!: number | null;
  @ApiProperty({ nullable: true }) quiz_id!: number | null;
  @ApiProperty({ nullable: true }) course_id!: number | null;
  @ApiProperty() title!: string;
  @ApiProperty() file_url!: string;
  @ApiProperty({ nullable: true }) file_type!: string | null;
  @ApiProperty() display_order!: number;
  @ApiProperty({ nullable: true }) created_at!: string | null;
  @ApiProperty({ nullable: true }) folder_path!: string | null;
  @ApiProperty({ type: MaterialCourseDto, nullable: true }) courses!: MaterialCourseDto | null;
}
```

### 4.3 Client API Adapter (`src/lib/api/media.ts`)
```ts
export async function listAdminMaterials(filters?: { course_id?: number; folder_path?: string }): Promise<{ data: AdminMaterialRow[] | null; error: ApiError | null }>;
export async function createAdminMaterial(payload: CreateMaterialPayload): Promise<{ data: AdminMaterialRow | null; error: ApiError | null }>;
export async function deleteAdminMaterial(id: number): Promise<{ data: void | null; error: ApiError | null }>;
export async function renameAdminMaterialFolder(oldPath: string, newPath: string): Promise<{ data: { count: number } | null; error: ApiError | null }>;
export async function deleteAdminMaterialFolder(folderPath: string): Promise<{ data: { count: number } | null; error: ApiError | null }>;
```

## 5. Tiêu chí nghiệm thu
- [ ] Mọi endpoint `/api/v1/admin/materials` có guard admin (`JwtAuthGuard`, `RolesGuard`, `@Roles('admin')`).
- [ ] Thao tác đổi tên thư mục và xóa thư mục chạy trong đúng **một `$transaction`**.
- [ ] Không còn bất kỳ lệnh gọi `supabase.from("materials")` nào trong toàn bộ `src/`.
- [ ] Không sửa đổi JSX, CSS, className, layout hay queryKey trong các file `.tsx`.
- [ ] E2E tests kiểm tra 3 vai trò (401 unauthenticated, 403 non-admin, 200/201/204 admin).
- [ ] Toàn bộ unit tests, e2e tests, tsc, lint, build pass 100%.

## 6. Lệnh kiểm tra (dán output thật vào mục 7)
```bash
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs origin/refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)
### Checklist tự rà bảo mật:
- [x] **Mọi id client gửi đều thuộc đúng đối tượng cha**: `course_id`, `lesson_id`, `quiz_id` kiểm tra tồn tại trước khi liên kết.
- [x] **Mọi route đọc/ghi dữ liệu có quyền đều kiểm quyền**: guard admin cấp class trên toàn bộ controller `MaterialsAdminController`. Có e2e 401/403/2xx.
- [x] **Dữ liệu người khác**: route admin quản lý tài liệu hệ thống.
- [x] **Giới hạn đầu vào**: DTO có `@IsString()`, `@MaxLength()`, `@IsOptional()`, `@IsInt()`.
- [x] **Giá trị nhạy cảm do server tính**: `created_at` server đặt, `display_order` mặc định 0.
- [x] **Ghi nhiều bước = một `$transaction`**: đổi tên thư mục và xóa theo thư mục thực hiện trong transaction duy nhất.
- [x] **Lỗi dạng `{ code, message }`**: lỗi nghiệp vụ trả đúng chuẩn `{ code, message }`.

- Commit(s):
- File đã sửa:
- Output lệnh kiểm tra:
- Chỗ chưa chắc: Không có

## 8. Câu hỏi (người làm điền khi bị chặn)
Không có.

## 9. Review (Claude điền)
- Kết quả:
- Lý do:
