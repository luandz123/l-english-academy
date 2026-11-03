# Bối cảnh
Giai đoạn refactor (React + Supabase → React + NestJS + PostgreSQL) đã xong và cutover lên production (docs/PROGRESS.md, docs/CUTOVER.md).
**Giai đoạn hiện tại: tối ưu UI/UX** (từ 2026-11-03). Trước mỗi task đọc docs/UX_REVIEW.md và docs/PROGRESS.md.
Tài liệu refactor (HLD, PARITY, OPEN_QUESTIONS, CURRENT_STATE) vẫn dùng làm tham chiếu cho tầng dữ liệu.

# Luật giai đoạn UI/UX
1. Được sửa JSX, CSS, class Tailwind, layout, câu chữ giao diện để giải quyết vấn đề trải nghiệm đã ghi trong docs/UX_REVIEW.md hoặc chủ dự án yêu cầu.
2. Không đổi route, query key TanStack Query hay hợp đồng API nếu không bắt buộc; nếu phải đổi thì ghi rõ trong commit.
3. Không thêm tính năng mới ngoài yêu cầu. Thay đổi nội dung/sản phẩm (bỏ tính năng, đổi tên, đổi lời hứa) phải có quyết định của chủ dự án, ghi vào docs/UX_REVIEW.md.
4. Giữ phong cách hiện có (nền tối, màu cyan/xanh, component shadcn/ui). Không thêm thư viện UI mới.
5. Không hiển thị số liệu giả như số thật (bạn bè giả, tiến độ bịa, số đếm viết cứng).
6. Số liên hệ chính thức: hotline/Zalo **0334 729 066**.
7. Kiểm tra trên cả máy tính (1440px) và điện thoại (390px); vùng bấm trên điện thoại tối thiểu ~40px.

# Luật cứng giai đoạn refactor (vẫn áp dụng cho tầng dữ liệu và backend)
1. (Hết hiệu lực từ giai đoạn UI/UX, xem luật giai đoạn UI/UX ở trên.)
2. Tầng dữ liệu mới trả về đúng shape cũ để component không phải đổi.
3. Ở tầng dữ liệu/backend: không thêm, bớt chức năng khi chưa có quyết định của chủ dự án. Gặp hành vi lạ thì ghi lại, không tự quyết.
4. Mỗi policy RLS cũ phải có kiểm tra tương ứng ở backend và có test.
5. Điểm số, đáp án đúng, quyền truy cập, giá tiền, XP: luôn tính ở server. Client không gửi các giá trị này.
6. Mỗi task chỉ một module. Chỉ sửa module khác khi tối thiểu cần thiết và phải ghi rõ.
7. Không commit secret. Mọi cấu hình qua biến môi trường, có .env.example.
8. Không tự ý nâng cấp thư viện lớn hoặc đổi công cụ đã chọn.

# Chuẩn backend
- controller -> service -> repository. DTO với class-validator. Không trả entity thẳng ra ngoài, dùng mapper.
- Transaction cho thao tác nhiều bước. Lỗi qua exception filter. Dùng migration, không synchronize.
- Interface/abstraction chỉ khi có từ 2 implementation thật (ví dụ StorageService, MailService). Không over-engineer.
- Một module một thư mục. Không import repository của module khác, đi qua service được export.
- Mọi endpoint có Swagger decorator, guard rõ ràng và test cho quy tắc phân quyền.

# Chuẩn frontend
- Gọi API chỉ qua src/lib/api. Component không gọi fetch trực tiếp. Giữ nguyên query key và cách dùng TanStack Query hiện có.

# Definition of Done
Lint, typecheck, test, build pass (dán output thật). Với task UI/UX: ảnh trước/sau ở desktop và mobile, cập nhật trạng thái mục trong docs/UX_REVIEW.md. Với task backend: Swagger cập nhật, test phân quyền. PROGRESS.md cập nhật. Commit theo Conventional Commits.
