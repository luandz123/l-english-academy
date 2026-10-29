# Bối cảnh
Refactor L-English từ React + Supabase gọi trực tiếp sang React + NestJS + PostgreSQL (modular monolith). Trước mỗi task đọc: docs/HLD.md, docs/PARITY.md, docs/PROGRESS.md, docs/OPEN_QUESTIONS.md và phần liên quan trong docs/CURRENT_STATE.md.
Code cũ (src/, supabase/, api/) là nguồn sự thật về hành vi. Không xóa cho tới khi PROGRESS.md ghi đã parity toàn bộ.

# Luật cứng
1. Không sửa JSX, CSS, class Tailwind, layout, câu chữ giao diện. Chỉ sửa tầng dữ liệu (hooks, services, api client).
2. Tầng dữ liệu mới trả về đúng shape cũ để component không phải đổi.
3. Không thêm, bớt hay 'cải thiện' chức năng. Gặp hành vi lạ thì ghi OPEN_QUESTIONS.md và giữ hành vi cũ, không tự quyết.
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
Lint, typecheck, test, build pass (dán output thật). Visual test không lệch. PARITY.md tick đúng dòng kèm file cũ và file mới. Swagger cập nhật. PROGRESS.md cập nhật. Commit theo Conventional Commits.
