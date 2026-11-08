# Bối cảnh
L-English chạy React (Vite) + NestJS (modular monolith) + PostgreSQL (Neon). Refactor từ Supabase đã xong và cutover lên production ngày 2026-10-29. Tài liệu refactor nằm ở docs/archive/refactor/ (HLD, PARITY, CURRENT_STATE...) và chỉ dùng để tra cứu.
**Giai đoạn hiện tại: phát triển tính năng mới và tối ưu UI/UX** (từ 2026-11-09). Trước mỗi task đọc docs/PROGRESS.md và docs/UX_REVIEW.md.
Supabase vẫn còn dùng cho đúng 2 việc: Storage `materials` (media, backend upload bằng service key) và Realtime Broadcast (PvP Word Shooter, signaling phòng nói). Không thêm cách dùng Supabase mới. Dữ liệu và auth đi qua backend.

# Luật làm tính năng và UI/UX
1. Chỉ làm tính năng chủ dự án yêu cầu. Thay đổi sản phẩm (thêm, bỏ hay đổi tên tính năng, đổi lời hứa) phải có quyết định của chủ dự án và ghi vào docs/UX_REVIEW.md.
2. Được sửa JSX, CSS, class Tailwind, layout và câu chữ. Khi đổi route, query key TanStack Query hay hợp đồng API đang dùng thì ghi rõ trong commit.
3. Giữ phong cách hiện có (nền tối, màu cyan/xanh, component shadcn/ui). Không thêm thư viện UI mới.
4. Không hiển thị số liệu giả như số thật (bạn bè giả, tiến độ bịa, số đếm viết cứng).
5. Số liên hệ chính thức: hotline/Zalo **0334 729 066**.
6. Kiểm tra trên cả máy tính (1440px) và điện thoại (390px). Vùng bấm trên điện thoại tối thiểu ~40px.

# Luật cứng
1. Điểm số, đáp án đúng, quyền truy cập, giá tiền, XP: luôn tính ở server. Client không gửi các giá trị này.
2. Mỗi endpoint mới có kiểm tra phân quyền ở backend và test (khách 401, sai người hoặc sai vai trò 403/404, chủ sở hữu hoặc admin 2xx).
3. Mỗi task gọn trong một module. Chỉ sửa module khác khi tối thiểu cần thiết và phải ghi rõ.
4. Không commit secret. Mọi cấu hình qua biến môi trường, có .env.example.
5. Không tự ý nâng cấp thư viện lớn hoặc đổi công cụ đã chọn. Thêm dịch vụ ngoài (AI, mail, storage...) phải được chủ dự án duyệt.

# Chuẩn backend
- controller -> service -> repository. DTO với class-validator. Không trả entity thẳng ra ngoài, dùng mapper.
- Transaction cho thao tác nhiều bước. Lỗi qua exception filter. Dùng migration Prisma, không synchronize.
- Interface/abstraction chỉ khi có từ 2 implementation thật (ví dụ StorageService, MailService). Không over-engineer.
- Một module một thư mục. Không import repository của module khác, đi qua service được export.
- Mọi endpoint có Swagger decorator, guard rõ ràng và test cho quy tắc phân quyền.

# Chuẩn frontend
- Gọi API chỉ qua src/lib/api. Component không gọi fetch trực tiếp. Giữ cách dùng TanStack Query hiện có.

# Definition of Done
Lint, typecheck, test, build pass (dán output thật). Task có giao diện: ảnh trước/sau ở desktop và mobile, cập nhật docs/UX_REVIEW.md. Task backend: Swagger cập nhật, test phân quyền, migration nếu đổi schema. PROGRESS.md cập nhật. Commit theo Conventional Commits.
