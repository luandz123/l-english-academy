# T-001: CatalogModule — endpoint đọc danh mục và khóa học (backend)

> **Người làm**: Antigravity · **Module**: Catalog · **Nhánh**: `task/T-001-catalog-read` (tách từ `refactor/nestjs-backend`)
> **Phụ thuộc**: P0 xong (schema Prisma baseline đã có) · **Ước lượng**: 2–3 giờ
> Đọc trước: `AGENTS.md`, `docs/REFACTOR_PLAN.md` §4–§5, `docs/adr/0006-backend-stack-versions.md`, file này. Gặp gì không rõ: **dừng và ghi vào mục 8**, không tự đoán.

## 1. Mục tiêu
Tạo `CatalogModule` với 4 endpoint **công khai, chỉ đọc** thay cho các truy vấn `courses` / `course_categories` phía học viên. Đây là module mẫu đầu tiên — cấu trúc của nó sẽ được các module sau làm theo, nên ưu tiên rõ ràng hơn ngắn gọn.

## 2. Phạm vi
**Được tạo/sửa**
- `backend/src/modules/catalog/catalog.module.ts`
- `backend/src/modules/catalog/catalog.controller.ts`
- `backend/src/modules/catalog/catalog.service.ts`
- `backend/src/modules/catalog/catalog.repository.ts` — chỉ file này được dùng `PrismaService`
- `backend/src/modules/catalog/catalog.mapper.ts` — Prisma model → DTO response (snake_case)
- `backend/src/modules/catalog/dto/*.ts` — query DTO (class-validator) và response DTO (Swagger)
- `backend/src/modules/catalog/*.spec.ts` — unit test service + mapper
- `backend/test/catalog.e2e-spec.ts` — e2e với Postgres thật (Testcontainers đã có sẵn trong `test/setup/`)
- `backend/src/app.module.ts` — chỉ thêm `CatalogModule` vào `imports`

**Cấm sửa**: mọi file frontend; `prisma/schema.prisma`; migration; file ngoài danh sách trên.

## 3. Hành vi cũ cần giữ (nguồn sự thật)
| Chỗ dùng cũ | Truy vấn Supabase |
|---|---|
| `src/components/landing/CourseShowcase.tsx:210` | `course_categories` · `select *` · `is_active = true` · order `display_order` asc, `id` asc |
| `src/components/landing/SidebarNav.tsx:66` | `course_categories` · `select *` · `is_active = true` · order `display_order` asc |
| `src/components/landing/CourseShowcase.tsx:228`, `DashboardPage.tsx:85`, `MyCoursesPage.tsx:62`, `LibraryPage.tsx:18` | `courses` · `select *` · `is_active = true` · order `display_order` asc, `id` **desc** |
| `src/pages/FullTestsPage.tsx:18` | như trên + `course_type = 'fulltest'` |
| `src/pages/ListeningPage.tsx:18` | như trên + `course_type = 'listening'` |
| `src/components/landing/HeroSection.tsx:17` | `courses` · count exact · `is_active = true` |
| `src/pages/LearnPage.tsx:43`, `App.tsx:38`, `FullTestExam.tsx:324` | `courses` · theo `id` · `maybeSingle()` (không có → `null`) |

**Policy RLS tương ứng** (mỗi cái phải có test e2e):
- `Courses viewable by all` — `SELECT USING (true)`: ai cũng đọc được, **kể cả chưa đăng nhập**, kể cả khóa `is_active = false` nếu không lọc.
- `Cho phép mọi người đọc danh mục khóa học` — `SELECT USING (true)`: như trên cho `course_categories`.
- Ghi (`Admins manage …`) **không** thuộc task này — không tạo endpoint ghi.

## 4. Đặc tả
Prefix toàn cục đã có: `/api`, version mặc định `1` → các route dưới đây là `/api/v1/...`.

| Method | Route | Query | Trả về |
|---|---|---|---|
| GET | `/catalog/categories` | `active?: boolean` | `CourseCategoryDto[]`, order `display_order` asc, `id` asc |
| GET | `/catalog/courses` | `active?: boolean`, `courseType?: 'video_quiz' \| 'flashcard' \| 'listening' \| 'speaking' \| 'fulltest'` | `CourseDto[]`, order `display_order` asc, `id` desc |
| GET | `/catalog/courses/count` | `active?: boolean` | `{ "count": number }` |
| GET | `/catalog/courses/:id` | `id` là số nguyên dương (`ParseIntPipe`) | `CourseDto`; không có → **404** `{ code: "COURSE_NOT_FOUND" }` |

Quy ước:
- Query `active`: chuỗi `"true"`/`"false"` → boolean (dùng `@Transform`); bỏ trống = không lọc. Giá trị khác → 400 `VALIDATION_FAILED`.
- Khai báo route `courses/count` **trước** `courses/:id`.
- **Shape response = đúng cột DB, snake_case** (luật 2 AGENTS.md), ví dụ `CourseDto`: `id, title, subtitle, description, course_type, category_id, price, duration_months, thumbnail_url, instructor, is_active, is_free, display_order, created_at`. `CourseCategoryDto`: `id, name, slug, icon, display_order, is_active, created_at`.
- `course_categories.id` và `courses.category_id` là `BigInt` trong Prisma → mapper đổi sang `number` (PostgREST trả số). `created_at` → chuỗi ISO (`toISOString()`). Giữ `null` là `null`, không bỏ field.
- Không trả entity Prisma thẳng ra ngoài — luôn qua `catalog.mapper.ts`.
- Không guard (endpoint công khai). Ghi chú `// Public: RLS "Courses viewable by all"` trên controller để khi thêm guard toàn cục ở P1 sẽ gắn `@Public()`.
- Swagger: `@ApiTags('catalog')`, `@ApiOperation`, `@ApiOkResponse({ type })`, `@ApiNotFoundResponse` cho `:id`.
- Cấu trúc: controller chỉ nhận/validate request và gọi service; service chứa quy tắc (lọc, 404); repository chỉ truy vấn Prisma.

## 5. Tiêu chí nghiệm thu
- [ ] 4 endpoint đúng route, query, thứ tự sắp xếp, shape như mục 4
- [ ] E2E (seed dữ liệu trong test bằng `PrismaClient` qua `app.get(PrismaService)`):
  - [ ] gọi **không có** header `Authorization` vẫn 200 (policy "viewable by all")
  - [ ] `active=true` loại khóa/danh mục `is_active=false`; bỏ `active` thì trả cả hai
  - [ ] `courseType=listening` chỉ trả khóa listening; `courseType=abc` → 400
  - [ ] thứ tự: 2 khóa cùng `display_order` → `id` lớn đứng trước; danh mục cùng `display_order` → `id` nhỏ đứng trước
  - [ ] `/catalog/courses/999999` → 404 `COURSE_NOT_FOUND`; `/catalog/courses/abc` → 400
  - [ ] response có đủ mọi cột snake_case, `id`/`category_id` là `number`
  - [ ] dọn dữ liệu seed sau mỗi test (không phụ thuộc thứ tự chạy)
- [ ] Unit test service (repository mock) cho nhánh 404 và mapper (BigInt → number, Date → ISO)
- [ ] Không thêm endpoint ghi; không sửa file ngoài phạm vi

## 6. Lệnh kiểm tra (dán output thật vào mục 7)
```bash
docker compose up -d postgres   # cần Docker Desktop đang chạy
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
```

## 7. Kết quả (người làm điền)

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
