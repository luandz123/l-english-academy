# T-004: Dọn các góp ý từ review T-001 / T-002

> **Người làm**: Antigravity · **Module**: Catalog · **Nhánh**: `task/T-004-catalog-cleanup` (tách từ `refactor/nestjs-backend` **sau khi `git pull`**)
> **Phụ thuộc**: không · **Ước lượng**: 1 giờ
> Đọc trước: `AGENTS.md`, mục 9 của `T-001-catalog-read.md` và `T-002-catalog-adapter.md`, file này. Gặp gì không rõ: **dừng và ghi vào mục 8**.

## 0. Bắt đầu
```bash
git fetch && git checkout refactor/nestjs-backend && git pull
git checkout -b task/T-004-catalog-cleanup
```

## 1. Mục tiêu
Refactor nhỏ, **không đổi hành vi**: bỏ code lặp và một chỗ nuốt lỗi quá rộng.

## 2. Phạm vi
**Được tạo/sửa**
- `backend/src/common/transforms/to-optional-boolean.ts` (mới) — hàm `toOptionalBoolean` dùng với `@Transform`
- `backend/src/common/transforms/to-optional-boolean.spec.ts` (mới)
- `backend/src/modules/catalog/dto/list-categories-query.dto.ts`, `list-courses-query.dto.ts`, `count-courses-query.dto.ts` — dùng `@Transform(toOptionalBoolean)` thay 3 hàm lặp
- `backend/src/modules/catalog/catalog.repository.ts` — `countCourses` nhận kiểu `Pick<CourseFilter, 'isActive'>` thay `CategoryFilter`
- `src/lib/api/catalog.ts` — `getCourse` chỉ đổi lỗi thành `{ data: null, error: null }` khi `error.code === "COURSE_NOT_FOUND"` (bỏ điều kiện `status === 404`)
- `src/lib/api/catalog.test.ts` — thêm test: 404 với `code: "NOT_FOUND"` (sai route) **phải** trả về `error`

**Cấm sửa**: mọi file `.tsx`, file ngoài danh sách, hành vi của endpoint.

## 3. Hành vi cần giữ
- `active=true|false` → boolean; bỏ trống/chuỗi rỗng → không lọc; giá trị khác → 400 `VALIDATION_FAILED` (như hiện tại).
- Toàn bộ test hiện có của catalog vẫn pass **không sửa nội dung test cũ**.

## 4. Tiêu chí nghiệm thu
- [ ] Không còn hàm `Transform` viết lặp trong 3 DTO
- [ ] Unit test cho `toOptionalBoolean`: `'true'`, `'false'`, `true`, `false`, `''`, `undefined`, `null`, `'abc'`
- [ ] Test mới cho `getCourse` với 404 `NOT_FOUND`
- [ ] `node scripts/check-ui-diff.mjs refactor/nestjs-backend` OK

## 5. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7 (không tóm tắt, không viết lại)
```bash
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 6. Quy tắc báo cáo (áp dụng từ task này)
- Mô tả đúng **code đã commit**; nếu không chắc, trích `git diff` thay vì diễn giải.
- Không đánh dấu PARITY/PROGRESS — Claude cập nhật khi review.

## 7. Kết quả (người làm điền)

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
