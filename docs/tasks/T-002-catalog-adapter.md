# T-002: Adapter catalog phía frontend — thay truy vấn Supabase bằng API

> **Người làm**: Antigravity · **Module**: Catalog (frontend) · **Nhánh**: `task/T-002-catalog-adapter` (tách từ `task/T-001-catalog-read` sau khi T-001 PASS)
> **Phụ thuộc**: T-001 PASS · **Ước lượng**: 2 giờ
> Đọc trước: `AGENTS.md`, `docs/REFACTOR_PLAN.md` §5 (**vùng được sửa**), `src/lib/api/client.ts`, file này. Gặp gì không rõ: **dừng và ghi vào mục 8**.

## 1. Mục tiêu
Tạo `src/lib/api/catalog.ts` gọi 4 endpoint của T-001 và thay **đúng 12 lệnh gọi Supabase** phía học viên, giao diện không đổi một pixel.

## 2. Phạm vi
**Được tạo**
- `src/lib/api/catalog.ts` — hàm adapter
- `src/lib/api/catalog.test.ts` — test Vitest (mock `fetch`)

**Được sửa — chỉ trong vùng §5 REFACTOR_PLAN** (dòng `import` + thân `queryFn` phần gọi dữ liệu):
| File | Dòng | Thay bằng |
|---|---|---|
| `src/components/landing/CourseShowcase.tsx` | 210 | `listCategories({ active: true })` |
| `src/components/landing/CourseShowcase.tsx` | 228 | `listCourses({ active: true })` |
| `src/components/landing/SidebarNav.tsx` | 66 | `listCategories({ active: true })` |
| `src/components/landing/HeroSection.tsx` | 17 | `countCourses({ active: true })` — **chỉ** phần tử courses; dòng `profiles` (16) giữ nguyên |
| `src/pages/DashboardPage.tsx` | 85 | `listCourses({ active: true })` |
| `src/pages/MyCoursesPage.tsx` | 62 | `listCourses({ active: true })` |
| `src/pages/LibraryPage.tsx` | 18 | `listCourses({ active: true })` |
| `src/pages/FullTestsPage.tsx` | 18 | `listCourses({ active: true, courseType: "fulltest" })` |
| `src/pages/ListeningPage.tsx` | 18 | `listCourses({ active: true, courseType: "listening" })` |
| `src/pages/LearnPage.tsx` | 43 | `getCourse(cId)` |
| `src/App.tsx` | 38 | `getCourse(cId)` |
| `src/pages/FullTestExam.tsx` | 324 | `getCourse(Number(courseId))` |
| `vite.config.ts` | `server` | thêm proxy dev `/api/v1` → `http://localhost:3000` (mô phỏng rewrite Vercel) |

**Cấm sửa**
- JSX, `className`, chuỗi hiển thị (kể cả `console.error`, toast), `queryKey`, tên state, `enabled`, kiểu generic của `useQuery`.
- Truy vấn `modules` (`DashboardPage.tsx:151`, `LearnPage.tsx:51`, `MyCoursesPage.tsx:106`) — thuộc module Learning, task sau.
- Mọi file trong `src/pages/admin/`, `src/components/admin/`.
- Dòng `profiles` trong `HeroSection.tsx`.

## 3. Hành vi cũ cần giữ
Xem bảng mục 3 của `T-001-catalog-read.md`. Thêm:
- Component đang viết `const { data, error } = await supabase.from(...)...; if (error) ...`. Adapter **trả về `{ data, error }`** (dùng `toResult` trong `client.ts`) để chỉ phải đổi vế phải của dòng gọi; giữ nguyên `if (error) throw error` / `console.error(...)` / `return data || []`.
- `maybeSingle()` cũ: không có bản ghi → `data = null`, `error = null`. `getCourse` phải map **404 `COURSE_NOT_FOUND` → `{ data: null, error: null }`**; lỗi khác vẫn trả `error`.
- Truy vấn cũ ở `App.tsx` chỉ select `course_type`, ở `FullTestExam.tsx` chỉ select `is_free`. Trả về cả bản ghi là tương thích (component chỉ đọc field đó) — không cần endpoint riêng.
- `HeroSection.tsx` đọc `coursesRes.count`: `countCourses` trả `{ count, error }` (`count = null` khi lỗi, component đã có `|| 0`).

## 4. Đặc tả `src/lib/api/catalog.ts`
```ts
export type CourseType = "video_quiz" | "flashcard" | "listening" | "speaking" | "fulltest";
export interface CourseRow { /* đúng các cột snake_case như CourseDto của T-001 */ }
export interface CourseCategoryRow { /* đúng các cột như CourseCategoryDto */ }

listCategories(params?: { active?: boolean }): Promise<{ data: CourseCategoryRow[] | null; error: ApiError | null }>
listCourses(params?: { active?: boolean; courseType?: CourseType }): Promise<{ data: CourseRow[] | null; error: ApiError | null }>
countCourses(params?: { active?: boolean }): Promise<{ count: number | null; error: ApiError | null }>
getCourse(id: number): Promise<{ data: CourseRow | null; error: ApiError | null }>
```
- Chỉ dùng `apiClient` / `toResult` từ `./client` — không gọi `fetch` trực tiếp.
- Nếu component đang khai báo kiểu riêng (`CourseRow` trong `LibraryPage`…), **không** đổi kiểu đó; adapter trả kiểu tương thích.

## 5. Tiêu chí nghiệm thu
- [ ] 12 lệnh gọi ở bảng mục 2 đã thay; `grep -n "supabase" <file>` ở các file đó chỉ còn các truy vấn bị loại trừ
- [ ] `catalog.test.ts`: đúng URL + query cho từng hàm; `getCourse` 404 → `{ data: null, error: null }`; 500 → có `error`; `countCourses` trả `count`
- [ ] `node scripts/check-ui-diff.mjs` **OK** (không có className/JSX/chữ tiếng Việt/queryKey trong diff)
- [ ] `npm test` và `npm run build` ở root pass; `npm run typecheck` không phát sinh lỗi mới so với mốc 40 lỗi có sẵn (ghi số lỗi trước/sau)
- [ ] Kiểm tra tay **chưa bắt buộc** (DB local chưa có dữ liệu nội dung — script copy dữ liệu thuộc P1). Nếu muốn thử: `docker compose up -d`, chạy backend, `npm run dev`, mở `/` thấy danh sách rỗng mà không lỗi console.

## 6. Lệnh kiểm tra (dán output thật vào mục 7)
```bash
npm test && npm run build && npm run typecheck; node scripts/check-ui-diff.mjs task/T-001-catalog-read
```

## 7. Kết quả (người làm điền)

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
