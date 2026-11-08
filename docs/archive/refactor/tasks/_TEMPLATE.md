# T-xxx: <tên ngắn>

> **Người làm**: Antigravity | Claude · **Module**: <tên> · **Nhánh**: `task/T-xxx-<slug>` (tách từ `refactor/nestjs-backend`)
> **Phụ thuộc**: <task/mốc phải xong trước> · **Ước lượng**: <giờ>
> Đọc trước: `AGENTS.md`, `docs/REFACTOR_PLAN.md` §4–§5, file này. Gặp gì không rõ: **dừng và ghi vào mục "Câu hỏi"**, không tự đoán.

## 1. Mục tiêu
<1–2 câu: làm gì, để làm gì>

## 2. Phạm vi
**Được tạo/sửa**
- `đường/dẫn/file` — <làm gì>

**Cấm sửa**
- JSX, `className`, chuỗi hiển thị, `queryKey`, tên state trong mọi file `.tsx` (REFACTOR_PLAN §5)
- File không liệt kê ở trên. Cần sửa thêm → ghi vào "Câu hỏi", không tự sửa.

## 3. Hành vi cũ cần giữ (nguồn sự thật)
| Chỗ dùng cũ | Truy vấn Supabase | Kết quả component mong đợi |
|---|---|---|
| `file.tsx:dòng` | `.from(...).select(...)...` | <shape> |

**Policy RLS tương ứng** (phải có test): <tên policy> — <quy tắc>

## 4. Đặc tả
<endpoint, DTO, shape trả về, mã lỗi, quy ước cụ thể>

## 5. Tiêu chí nghiệm thu
- [ ] <tiêu chí kiểm chứng được>
- [ ] Không thêm/bớt chức năng; không đổi shape dữ liệu component đang dùng
- [ ] Mọi endpoint có Swagger decorator và guard rõ ràng
- [ ] `node scripts/check-ui-diff.mjs` OK

## 6. Lệnh kiểm tra (dán output thật vào mục 7)
```bash
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs
```

## 7. Kết quả (người làm điền)
- Commit(s):
- File đã sửa:
- Output lệnh kiểm tra:
- Chỗ chưa chắc:

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
- Kết quả: PASS | FAIL (lần 1/2)
- Lý do:
