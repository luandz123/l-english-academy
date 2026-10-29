# ADR 0004: Cutover một lần thay vì Strangler Fig trên production

- **Trạng thái**: Đã chấp thuận (thay phần "Chiến lược di chuyển" trong HLD §4)
- **Ngày**: 2026-10-25
- **Người quyết định**: Claude đề xuất, chủ dự án duyệt (DECISIONS C-01)
- **Tài liệu tham chiếu**: [DECISIONS.md](../DECISIONS.md), [REFACTOR_PLAN.md](../REFACTOR_PLAN.md) §2, §6

---

## 1. Bối Cảnh
HLD chọn Strangler Fig: phần đã chuyển gọi NestJS, phần chưa chuyển vẫn gọi Supabase, cùng chạy trên production. Nhưng ADR 0002 chọn auth tự làm: người dùng đăng nhập qua NestJS không có session Supabase, nên mọi lệnh gọi Supabase còn lại bị RLS chặn (`auth.uid()` = null). Hiện chưa có người dùng thật.

## 2. Quyết Định
- Toàn bộ refactor làm trên nhánh `refactor/nestjs-backend`. `main` (Supabase) tiếp tục là production.
- Mỗi giai đoạn deploy lên **staging** (Render + Neon + Vercel Preview) để kiểm chứng.
- Cutover production **một lần** khi 100% lệnh gọi Supabase đã chuyển (P7): đóng băng nội dung → copy lại dữ liệu và media → đổi env/rewrite Vercel → đổi URL webhook SePay → giao dịch thật 2.000đ.
- Rollback: redeploy `main` + đổi URL webhook về `/api/payment-webhook` cũ; giữ dự án Supabase ≥ 30 ngày; mục tiêu < 15 phút, diễn tập trên staging trước.

## 3. Hệ Quả
- **Tích cực**: không duy trì hai hệ auth cùng lúc; rollback đơn giản; production không bị ảnh hưởng trong lúc refactor.
- **Đánh đổi**: production chỉ nhận giá trị ở cuối (~8–9 tuần); nhánh sống lâu dễ lệch với `main` → nếu phải sửa `main` thì merge `main` vào nhánh refactor ngay.

## 4. Các Phương Án Đã Loại Bỏ
1. **Strangler thật, làm Auth cuối cùng**: NestJS tạm verify JWT Supabase; chạy song song được nhưng phức tạp gấp đôi và đi ngược thứ tự HLD.
2. **Tự cấp JWT có chữ ký Supabase để RLS chấp nhận**: ghép nối mong manh, khó test.
