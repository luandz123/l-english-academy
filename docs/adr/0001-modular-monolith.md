# ADR 0001: Lựa Chọn Kiến Trúc Modular Monolith Với NestJS Và PostgreSQL Cho Dự Án L-English

- **Trạng thái**: Đã chấp thuận (Accepted)
- **Ngày**: 2026-10-24
- **Người quyết định**: Kỹ sư trưởng (Lead Engineer) & Đội ngũ Phát triển L-English
- **Tài liệu tham chiếu**: [CURRENT_STATE.md](../CURRENT_STATE.md), [HLD.md](../HLD.md), [AGENTS.md](../../AGENTS.md)

---

## 1. Bối Cảnh (Context)

Hệ thống L-English Academy ban đầu được xây dựng dựa trên kiến trúc Backend-as-a-Service (BaaS) với React (Vite) ở Frontend và Supabase SDK gọi trực tiếp CSDL. Mặc dù mô hình này cho phép tạo nhanh MVP, quá trình vận hành đã bộc lộ những lỗ hổng bảo mật và nợ kỹ thuật nghiêm trọng (chi tiết tại mục 5.3 và 10 của [CURRENT_STATE.md](../CURRENT_STATE.md)):

1. **Lộ đáp án trắc nghiệm**: Bảng `answers` có RLS `SELECT USING (true)` chứa cả cột `is_correct: true/false`. Học viên mở DevTools là thấy toàn bộ đáp án của bài thi.
2. **Client tự chấm điểm**: Frontend tự so sánh ID đáp án, tự tính điểm và gửi `score: 10/10` trực tiếp vào bảng điểm CSDL `user_quiz_results` và `user_full_test_results`.
3. **Lỗ hổng thanh toán**: Client tự tạo bản ghi `payment_orders` với giá tiền tùy ý (`amount`), cả `anon` và `authenticated` đều có quyền `UPDATE USING (true)` và quyền gọi hàm kích hoạt VIP PRO `complete_payment_order`.
4. **Phân mảnh backend**: Logic phân tán ở 3 nơi khác nhau (PostgREST API, Supabase Edge Functions trên Deno, và Vercel Serverless Functions trong thư mục `api/`).
5. **Dữ liệu phân tán**: Dữ liệu Gamification (XP, Streak, nhiệm vụ) và Rank game lưu tạm bợ trong `localStorage` của trình duyệt.

Hệ thống cần một kiến trúc Backend tập trung, có ranh giới rõ ràng, bảo vệ quyền riêng tư bài thi và giao dịch thanh toán, nhưng không làm phát sinh gánh nặng vận hành hạ tầng quá lớn.

---

## 2. Quyết Định (Decision)

Chúng tôi quyết định tái cấu trúc toàn bộ hệ thống sang kiến trúc **Modular Monolith** sử dụng công nghệ:
- **Framework**: **NestJS** (Node.js runtime, ngôn ngữ TypeScript).
- **Cơ sở dữ liệu**: **PostgreSQL** (kết nối trực tiếp vào schema 31 bảng hiện có).
- **ORM & Data Mapping**: **Prisma ORM** (type-safe schema, migration độc lập).
- **Giao thức**: REST API `/api/v1` chuẩn OpenAPI (Swagger) kết hợp SSE (Server-Sent Events cho thanh toán) và Socket.IO (cho đàm thoại Speaking & Game Word Shooter).

### Quy tắc triển khai Modular Monolith:
- Hệ thống được tổ chức thành **10 module chuyên biệt**: `Auth`, `Catalog`, `Learning`, `Assessment`, `Media`, `Payments`, `Admin`, `Gamification`, `Speaking`, `Games`.
- **Nguyên tắc ranh giới (Module Encapsulation)**: Mỗi module quản lý các thực thể riêng biệt. Module A **tuyệt đối không được import Repository của Module B** mà bắt buộc phải giao tiếp thông qua Service công khai được export của Module B.
- **Tầng kiến trúc nội bộ**: `Controller -> Service -> Repository / PrismaService`, truyền nhận dữ liệu thông qua DTO (Data Transfer Object) có xác thực tự động bằng `class-validator`.

---

## 3. Hệ Quả (Consequences)

### Tích cực (Positive):
1. **Bảo mật tuyệt đối**: Toàn bộ logic chấm điểm, quy đổi điểm TOEIC ETS, kiểm tra quyền truy cập khóa học và tính giá tiền thanh toán được chuyển 100% về phía server. Client không còn quyền can thiệp hay đọc trước đáp án.
2. **Đơn giản hóa hạ tầng & Vận hành**:
   - Triển khai toàn bộ backend như một tiến trình Node.js đơn lẻ (Single Deployable Unit / Docker Container).
   - Không phát sinh latency mạng nội bộ, không cần cấu hình Service Discovery, API Gateway trung gian hay Distributed Tracing phức tạp như microservices.
   - Không cần thêm Redis hay Message Queue ở giai đoạn hiện tại; CSDL PostgreSQL hiện có đủ sức đáp ứng.
3. **Trải nghiệm phát triển (DX) cao**:
   - Sử dụng chung ngôn ngữ TypeScript với Frontend, dễ dàng chia sẻ interface và types.
   - Dependency Injection của NestJS giúp viết Unit Test và Integration Test dễ dàng, rõ ràng.
4. **Sẵn sàng mở rộng (Extensible)**: Các module được phân tách ranh giới rõ ràng, khi bất kỳ module nào (như `Games` hay `Assessment`) có lượng tải đột biến trong tương lai, module đó có thể dễ dàng tách ra thành một Microservice độc lập mà không cần viết lại nghiệp vụ.

### Tiêu cực & Đánh đổi (Negative / Trade-offs):
1. **Rủi ro Coupling (Ràng buộc mã nguồn)**: Nếu các lập trình viên thiếu kỷ luật, các module có thể vô tình phụ thuộc chéo hoặc gọi vòng tròn (Circular Dependency). Cần duy trì các quy tắc trong [AGENTS.md](../../AGENTS.md) và linter nghiêm ngặt.
2. **Tác động lỗi diện rộng**: Một lỗi unhandled exception nghiêm trọng ở một module có thể làm khởi động lại toàn bộ tiến trình. Giải pháp: Áp dụng Global Exception Filter chặt chẽ và giám sát tiến trình bằng PM2 / Docker healthcheck.

---

## 4. Các Phương Án Đã Loại Bỏ (Rejected Alternatives)

### 1. Kiến trúc Microservices (Tách riêng Auth Service, Payment Service, Quiz Service...)
- **Lý do loại bỏ**: Chi phí vận hành, giám sát (K8s, Consul, Kafka) và độ phức tạp vượt xa quy mô hiện tại của ứng dụng. Rủi ro distributed transaction giữa thanh toán và ghi danh khóa học rất cao mà không mang lại giá trị tương xứng ở thời điểm này.

### 2. Tiếp tục dùng Supabase BaaS + Edge Functions
- **Lý do loại bỏ**: Supabase Edge Functions chạy trên Deno trong khi Vercel API chạy trên Node.js, gây phân mảnh môi trường. Cơ chế RLS trở nên quá cồng kềnh khi phải nhồi nhét toàn bộ logic chấm thi TOEIC 200 câu và scale điểm ETS vào PostgreSQL Stored Procedures. Khó khăn trong việc viết Unit Test và kiểm soát phiên bản.

### 3. Backend viết bằng Go (Golang) hoặc Python (FastAPI)
- **Lý do loại bỏ**: Đội ngũ phát triển hiện tại đang làm việc với React/TypeScript. Việc chuyển sang Go hoặc Python sẽ làm mất đi khả năng tái sử dụng kỹ năng ngôn ngữ, kéo dài thời gian hoàn thành refactor và không chia sẻ được type định dạng dữ liệu với Frontend. NestJS mang lại sự đồng bộ công nghệ (Fullstack TypeScript) tối ưu nhất.
