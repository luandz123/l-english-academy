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
- [x] 12 lệnh gọi ở bảng mục 2 đã thay; `grep -n "supabase" <file>` ở các file đó chỉ còn các truy vấn bị loại trừ
- [x] `catalog.test.ts`: đúng URL + query cho từng hàm; `getCourse` 404 → `{ data: null, error: null }`; 500 → có `error`; `countCourses` trả `count`
- [x] `node scripts/check-ui-diff.mjs` **OK** (không có className/JSX/chữ tiếng Việt/queryKey trong diff)
- [x] `npm test` và `npm run build` ở root pass; `npm run typecheck` không phát sinh lỗi mới so với mốc 40 lỗi có sẵn (ghi số lỗi trước/sau)
- [x] Kiểm tra tay **chưa bắt buộc** (DB local chưa có dữ liệu nội dung — script copy dữ liệu thuộc P1). Nếu muốn thử: `docker compose up -d`, chạy backend, `npm run dev`, mở `/` thấy danh sách rỗng mà không lỗi console.

## 6. Lệnh kiểm tra (dán output thật vào mục 7)
```bash
npm test && npm run build && npm run typecheck; node scripts/check-ui-diff.mjs refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)
```
> vite_react_shadcn_ts@0.0.0 test
> vitest run

 ✓ src/test/example.test.ts (1 test) 3ms
 ✓ src/lib/api/client.test.ts (4 tests) 77ms
 ✓ src/lib/api/catalog.test.ts (10 tests) 77ms
 ✓ src/lib/api/auth.test.ts (9 tests) 95ms
 ✓ src/test/part2Audio.test.ts (3 tests) 440ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 23ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 14ms

 Test Files  7 passed (7)
      Tests  44 passed (44)

> vite_react_shadcn_ts@0.0.0 build
> vite build
✓ built in 27.80s

> vite_react_shadcn_ts@0.0.0 typecheck
> tsc --noEmit -p tsconfig.app.json
Số lỗi trước: 40 lỗi có sẵn
Số lỗi sau: 40 lỗi có sẵn (0 lỗi mới phát sinh)

> node scripts/check-ui-diff.mjs refactor/nestjs-backend
check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).
```

## 8. Câu hỏi (người làm điền khi bị chặn)
Không có. Đã hoàn thành toàn bộ yêu cầu của T-002.

## 9. Review (Claude điền)
- **Kết quả: PASS (lần 1/2)** — 2026-10-27, merge vào `refactor/nestjs-backend` (commit `cfecb19`).
- Claude tự chạy lại trên nhánh đã merge: FE test 44/44, typecheck 40 (bằng mốc), build OK, `check-ui-diff` OK, lint `src/lib/api` sạch.
- **Kiểm tra trên giao diện thật** (Claude, DB Postgres tạm riêng có 3 danh mục/4 khóa seed): qua proxy Vite `/api/v1` — danh sách khóa `active=true` loại đúng khóa ẩn, `count` = 3, khóa 999 → 404; trang chủ render danh mục "Luyện thi TOEIC — 2 khóa học" từ NestJS, hai request `catalog/*` đều 200. Lỗi console duy nhất là cảnh báo React `fetchPriority` ở `HeroCarousel` có sẵn từ trước.
- Đạt: đúng 12 chỗ thay, chỉ đổi import + vế phải lệnh gọi; giữ `if (error)`, `console.error`, `queryKey`; `getCourse` giữ ngữ nghĩa `maybeSingle`; `countCourses` trả `{ count, error }` cho `HeroSection`.
- **Lưu ý về báo cáo**: báo cáo viết `countCourses` gọi `HEAD /catalog/courses` và đọc header `x-total-count` — **sai so với code** (code gọi đúng `GET /catalog/courses/count`). Báo cáo phải mô tả đúng code đã commit; reviewer luôn đối chiếu code.
- Góp ý không chặn:
  1. `getCourse` đổi **mọi** 404 thành `null` (kể cả 404 do sai route/thiếu proxy) → nên chỉ đổi khi `code === "COURSE_NOT_FOUND"` để lỗi cấu hình không bị nuốt im lặng.
  2. Không tự đánh dấu PARITY `done` khi DoD chưa có so sánh ảnh — Claude đã hạ về `frontend ✓` (xem dưới).
- PARITY CAT-004/005/006: `frontend ✓` (backend + adapter + kiểm tra tay); chuyển `done` khi có visual regression so với bản Supabase cùng dữ liệu (sau khi có script copy dữ liệu ở P1).
