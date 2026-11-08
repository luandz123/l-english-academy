# T-030: Báo Cáo Khảo Sát Realtime (Speaking + Games PvP)

> **Người thực hiện**: Antigravity · **Phạm vi**: Khảo sát hiện trạng & đề xuất kiến trúc (Chỉ viết tài liệu, KHÔNG sửa mã nguồn)  
> **Tài liệu tham chiếu**: `docs/tasks/BRIEFS.md`, `docs/adr/0005-realtime-relay.md`, `docs/OPEN_QUESTIONS.md` (#11, #28)  
> **Nhánh**: `task/T-030-realtime-survey` (tách từ `origin/refactor/nestjs-backend`)

---

## 1. Bối cảnh & Mục tiêu khảo sát
Theo Quyết định kỹ thuật số **#28** (`docs/OPEN_QUESTIONS.md`):
> *"Speaking + Games PvP để kịp tuần này: làm bản tối thiểu — chuyển phần dữ liệu + cấp token LiveKit qua backend, giữ cơ chế realtime hiện có nếu không phụ thuộc Supabase Auth. Khảo sát ở T-030, Claude chốt cách làm sau."*

Nhiệm vụ của tài liệu này là rà soát từng vị trí gọi Supabase trong các tính năng phòng luyện nói (Speaking Rooms) và trò chơi đối kháng (Word Shooter PvP), phân loại mức độ phụ thuộc vào Supabase Auth / RLS / Postgres CDC, và đưa ra đề xuất kỹ thuật tối thiểu để hệ thống vận hành trơn tru sau khi cắt cầu Supabase.

---

## 2. Bảng tổng hợp hiện trạng các điểm gọi Supabase

| STT | File & Dòng | Loại thao tác | Bảng / Kênh / RPC | Phụ thuộc `auth.uid()` / RLS | Tình trạng sau khi cắt cầu Supabase | Đề xuất tối thiểu |
| :---: | :--- | :--- | :--- | :---: | :--- | :--- |
| **1** | `speakingService.ts:41` | Query SELECT | `speaking_rooms`, `speaking_room_members`, `profiles` | Không trực tiếp | **Hỏng**: Bảng chưa có trên production (OPEN_QUESTIONS #11); sau cắt cầu client không dùng Supabase client để đọc DB | Chuyển sang endpoint NestJS `GET /api/v1/speaking/rooms` |
| **2** | `speakingService.ts:137` | Query SELECT | `speaking_rooms`, `speaking_room_members`, `profiles` | Không trực tiếp | **Hỏng**: Tương tự như trên | Chuyển sang endpoint NestJS `GET /api/v1/speaking/rooms/:id` |
| **3** | `speakingService.ts:196` | Mutation INSERT | `speaking_rooms` | **CÓ** (`auth.uid() = host_user_id`) | **Hỏng**: Thiếu Supabase session → RLS từ chối | Chuyển sang `POST /api/v1/speaking/rooms` (Guard JWT) |
| **4** | `speakingService.ts:245` | RPC & Fallback INSERT | `join_speaking_room` / `speaking_room_members`, `speaking_sessions` | **CÓ RẤT NẶNG** (`auth.uid()` trong RPC & RLS) | **Hỏng hoàn toàn**: RPC ném `UNAUTHORIZED` nếu không có `auth.uid()` | Chuyển toàn bộ logic RPC vào NestJS `POST /api/v1/speaking/rooms/:id/join` |
| **5** | `speakingService.ts:357` | RPC & Fallback DELETE/UPDATE | `leave_speaking_room` / `speaking_room_members`, `speaking_sessions` | **CÓ RẤT NẶNG** (`auth.uid()` trong RPC & RLS) | **Hỏng hoàn toàn**: RPC ném `UNAUTHORIZED`; RLS chặn delete | Chuyển logic rời phòng vào NestJS `POST /api/v1/speaking/rooms/:id/leave` |
| **6** | `speakingService.ts:399` | Mutation UPDATE | `speaking_rooms` (`status = 'closed'`) | **CÓ** (`auth.uid() = host_user_id`) | **Hỏng**: RLS chặn update | Chuyển sang `POST /api/v1/speaking/rooms/:id/close` |
| **7** | `speakingService.ts:419` | RPC & Fallback SELECT | `match_speaking_room` | **CÓ** (`auth.uid()` trong RPC) | **Hỏng**: RPC ném `UNAUTHORIZED` | Chuyển matchmaking vào NestJS `POST /api/v1/speaking/match` |
| **8** | `speakingService.ts:486, 521` | Query & UPDATE | `profiles` (`total_speaking_seconds`, `english_level`) | **CÓ** (RLS profiles update) | **Hỏng**: Không thể update profile qua Supabase client | Chuyển sang `GET /api/v1/speaking/stats` & `PUT /api/v1/speaking/level` |
| **9** | `api/speaking-token.ts:44` | Serverless Auth & Query | `supabase.auth.getUser()`, `speaking_rooms`, `profiles` | **CÓ** (Xác thực token bằng Supabase Auth) | **Hỏng hoàn toàn**: Token gửi lên là JWT của NestJS, `getUser()` sẽ trả 401 | Di dời toàn bộ logic vào NestJS `POST /api/v1/speaking/token` |
| **10** | `useVoiceRoom.ts:334` | Realtime Broadcast & Presence | Kênh `speaking-room:<id>` | **KHÔNG** (Dùng Anon Key, ephemeral) | **HOẠT ĐỘNG BÌNH THƯỜNG**: Không lưu DB, không phụ thuộc Auth | Giữ nguyên Supabase Realtime Broadcast & Presence |
| **11** | `SpeakingRoomsPage.tsx:99` | Realtime CDC | `postgres_changes` trên `speaking_rooms`, `speaking_room_members` | **CÓ** (Phụ thuộc WAL logical replication của Supabase DB) | **Hỏng**: DB production chuyển sang Neon / PostgreSQL tự host, Supabase CDC không nhận event | Thay bằng polling nhẹ (TanStack Query `refetchInterval: 5000`) |
| **12** | `WordShooterLobby.tsx:199` | Query SELECT | `vocab_questions` | **KHÔNG** (Public read) | **Cần chuyển**: Không query trực tiếp Supabase từ client | Chuyển sang gọi API `GET /api/v1/vocab/...` đã có |
| **13** | `WordShooterLobby.tsx:456, 548` | Realtime Broadcast | Kênh `lobby-pvp-<code>` | **KHÔNG** (Broadcast client-to-client, có fallback BroadcastChannel) | **HOẠT ĐỘNG BÌNH THƯỜNG**: Không phụ thuộc DB/Auth | Giữ nguyên Supabase Realtime Broadcast |
| **14** | `WordShooterArena.tsx:777` | Realtime Broadcast | Kênh `arena-pvp-<roomId>` | **KHÔNG** (Broadcast client-to-client, có fallback BroadcastChannel) | **HOẠT ĐỘNG BÌNH THƯỜNG**: Không phụ thuộc DB/Auth | Giữ nguyên Supabase Realtime Broadcast |
| **15** | `AdminGamesConfig.tsx:12` | Import thừa | Không dùng | Không | Không ảnh hưởng (chỉ import dư) | Xóa import dư ở T-033 |

---

## 3. Phân tích chi tiết từng phân hệ

### 3.1. Phân hệ phòng nói (Speaking Rooms)

#### A. Tầng dữ liệu & Phân quyền (Data & RPC)
- **Vấn đề cốt lõi**:
  - File migration `supabase/migrations/20261023_speaking_rooms.sql` gồm các bảng `speaking_rooms`, `speaking_room_members`, `speaking_sessions` và các hàm `join_speaking_room`, `leave_speaking_room`, `match_speaking_room` **chưa từng được áp dụng trên production** (ghi nhận tại OPEN_QUESTIONS #11).
  - Cả 3 hàm RPC đều gọi `v_user_id := auth.uid();` ở đầu hàm. Sau khi backend chuyển sang NestJS cấp access token, client không còn Supabase auth session, khiến mọi lệnh gọi RPC hoặc direct query đều thất bại với lỗi `UNAUTHORIZED` hoặc vi phạm RLS.
- **Giải pháp chuyển đổi**:
  - Tạo `SpeakingModule` trong NestJS (`backend/src/modules/speaking/`).
  - Thêm các bảng vào `schema.prisma`:
    - `SpeakingRoom`: `id` (UUID), `name`, `hostUserId`, `englishLevel`, `topics`, `visibility`, `passcode`, `capacity`, `status`, `createdAt`, `expiresAt`.
    - `SpeakingRoomMember`: `id` (UUID), `roomId`, `userId`, `role`, `joinedAt`, `lastSeenAt`, `isMuted`, `isSpeaking`.
    - `SpeakingSession`: `id` (UUID), `userId`, `roomId`, `startedAt`, `endedAt`, `durationSeconds`.
    - Mở rộng model `Profile`: thêm `englishLevel` (mặc định `'B1'`), `totalSpeakingSeconds` (mặc định `0`).
  - Chuyển toàn bộ nghiệp vụ kiểm tra concurrency, kiểm tra passcode, tính thời gian đàm thoại và chuyển quyền host sang TypeScript service với `$transaction` của Prisma.

#### B. Cấp quyền âm thanh & Token (LiveKit vs WebRTC Mesh)
- **Vấn đề cốt lõi**:
  - Endpoint `api/speaking-token.ts` hiện là Vercel Serverless Function, sử dụng `supabase.auth.getUser(token)` để giải mã danh tính người dùng. Khi chuyển sang JWT của NestJS, endpoint này không thể xác thực được token.
- **Giải pháp chuyển đổi**:
  - Đưa logic cấp token về NestJS: endpoint `POST /api/v1/speaking/token` (Guard `JwtAuthGuard`).
  - Lấy `userId` từ `@CurrentUser() user: AuthenticatedUser`.
  - Kiểm tra điều kiện phòng (phòng tồn tại, còn `active`, đúng passcode nếu là `private`).
  - Nếu hệ thống có cấu hình `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`: sinh token LiveKit JWT bằng `livekit-server-sdk`.
  - Nếu không có cấu hình LiveKit: trả về mode `webrtc-mesh` kèm danh sách STUN servers công khai như cũ.
  - Phía frontend (`speakingService.ts:getVoiceToken`): đổi URL gọi từ `/api/speaking-token` sang `/api/v1/speaking/token`.

#### C. Tín hiệu âm thanh (WebRTC Mesh Signaling)
- **Vấn đề cốt lõi**:
  - Khi chạy chế độ WebRTC Mesh (chưa có LiveKit Cloud), `useVoiceRoom.ts` sử dụng Supabase Realtime Broadcast (`supabase.channel("speaking-room:<id>")`) để trao đổi SDP Offers, Answers và ICE Candidates giữa các trình duyệt.
- **Đánh giá**:
  - Supabase Realtime Broadcast là kênh truyền thông điệp tạm thời (ephemeral), hoàn toàn không ghi vào Postgres và không đọc bảng RLS nào. Trình duyệt chỉ cần `VITE_SUPABASE_PUBLISHABLE_KEY` (hoặc Anon Key) là có thể tạo kênh và gửi broadcast `ice-candidate`, `offer`, `answer`.
- **Giải pháp tối thiểu**:
  - **Giữ nguyên 100% logic trong `useVoiceRoom.ts`**: Tiếp tục sử dụng Supabase Broadcast cho signaling WebRTC mesh. Không cần xây dựng Socket.IO relay gateway riêng trong giai đoạn này (đúng tinh thần quyết định #28 để đảm bảo tiến độ).
  - Khi có LiveKit key, hệ thống tự động chạy qua LiveKit SFU, hoàn toàn không chạm đến nhánh WebRTC Mesh.

#### D. Đồng bộ trạng thái danh sách phòng (Room List Realtime)
- **Vấn đề cốt lõi**:
  - `SpeakingRoomsPage.tsx:99-120` lắng nghe sự kiện `postgres_changes` trên bảng `speaking_rooms` và `speaking_room_members`. Khi chuyển DB sang PostgreSQL độc lập (Neon), Supabase CDC không còn nhận được event ghi từ NestJS backend.
- **Giải pháp tối thiểu**:
  - Bỏ `postgres_changes` trong `SpeakingRoomsPage.tsx`.
  - Cấu hình TanStack Query polling định kỳ: thêm `refetchInterval: 5000` (5 giây) cho query `["speaking-rooms", filters]` khi người dùng đang mở trang danh sách phòng. Khi rời trang, hook tự ngắt polling. Đây là giải pháp đơn giản nhất, triệt để nhất và không tạo phụ thuộc hạ tầng phức tạp.

---

### 3.2. Phân hệ trò chơi đối kháng (Word Shooter PvP)

#### A. Lobby tìm trận & ghép phòng (`WordShooterLobby.tsx`)
- **Tín hiệu phòng**:
  - Sử dụng kênh broadcast `supabase.channel("lobby-pvp-<code>")` để trao đổi sự kiện `player_joined`, `player_left`, `player_ready`, `game_start`.
  - Đã có sẵn dự phòng song song bằng native `BroadcastChannel("ws-lobby-<code>")` cho trường hợp test 2 tab trên cùng trình duyệt.
- **Đánh giá**:
  - Hoàn toàn là broadcast ephemeral, không lưu DB, không có RLS, không phụ thuộc Supabase Auth.
- **Giải pháp tối thiểu**:
  - **Giữ nguyên 100% cơ chế broadcast hiện tại**: Không cần sửa đổi mã nguồn.
  - Vị trí `fetchSupabaseWords` (dòng 199) query `vocab_questions`: chuyển thành lời gọi qua API `listVocabLessons` hoặc endpoint từ vựng backend (chuyển trong task dọn dẹp hoặc khi refactor game).

#### B. Đồng bộ trạng thái trận đấu (`WordShooterArena.tsx`)
- **Tín hiệu thi đấu**:
  - Sử dụng kênh broadcast `supabase.channel("arena-pvp-<roomId>")` để gửi thông điệp `state_sync` (vị trí phi thuyền, số mạng, điểm số, danh sách từ), `attack`, `game_over`.
  - Đã có sẵn dự phòng song song bằng native `BroadcastChannel("ws-arena-<roomId>")`.
- **Đánh giá**:
  - Hoàn toàn client-to-client, không tính điểm server, không phụ thuộc Auth.
- **Giải pháp tối thiểu**:
  - **Giữ nguyên 100% cơ chế broadcast hiện tại**: Không cần sửa đổi mã nguồn.

#### C. Hệ thống xếp hạng (`wordShooterRankService.ts`)
- **Đánh giá**:
  - Dữ liệu xếp hạng (Tier, Division, Stars, Bravery Points, Match History) hiện lưu trữ 100% tại `localStorage` với key `word_shooter_rank_v2`. Hoàn toàn không tương tác với Supabase DB.
- **Giải pháp tối thiểu**:
  - Giữ nguyên lưu trữ client-side theo đúng quyết định Gamification (OPEN_QUESTIONS #24).

---

## 4. Kế hoạch triển khai đề xuất cho Claude (T-031 / T-032)

Sau khi khảo sát, kế hoạch chia task tối thiểu được đề xuất như sau:

### Task T-031: Backend Module Speaking & Quản lý phòng (`SpeakingModule`)
1. **Prisma Schema & Migration**:
   - Thêm model `SpeakingRoom`, `SpeakingRoomMember`, `SpeakingSession`.
   - Thêm cột `english_level`, `total_speaking_seconds` vào `Profile`.
2. **NestJS Service & Controller (`SpeakingModule`)**:
   - `GET /api/v1/speaking/rooms`: Lấy danh sách phòng công khai đang active, kèm số lượng member và avatar host.
   - `GET /api/v1/speaking/rooms/:id`: Chi tiết phòng kèm danh sách thành viên đầy đủ.
   - `POST /api/v1/speaking/rooms`: Tạo phòng mới (chủ phòng tự động join).
   - `POST /api/v1/speaking/rooms/:id/join`: Tham gia phòng (kiểm tra sĩ số, passcode, tạo session trong transaction).
   - `POST /api/v1/speaking/rooms/:id/leave`: Rời phòng (tính thời gian đàm thoại, cập nhật profile, chuyển host).
   - `POST /api/v1/speaking/rooms/:id/close`: Đóng phòng (dành cho host).
   - `POST /api/v1/speaking/match`: Ghép cặp phòng nhanh theo trình độ & chủ đề.
   - `GET /api/v1/speaking/stats`: Thống kê thời gian nói của cá nhân.
   - `PUT /api/v1/speaking/level`: Cập nhật trình độ tiếng Anh cá nhân.
   - `POST /api/v1/speaking/token`: Cấp token LiveKit hoặc cấu hình STUN WebRTC Mesh (thay thế hoàn toàn `api/speaking-token.ts`).
3. **Unit Tests & E2E Tests**:
   - Test đầy đủ luồng join/leave/capacity/passcode/token với 3 vai trò (Guest / User / Admin).

### Task T-032: Frontend Client Adapter & Dọn dẹp Speaking
1. **Frontend API Client (`src/lib/api/speaking.ts`)**:
   - Viết các hàm adapter gọi NestJS API thay thế các lời gọi trực tiếp trong `speakingService.ts`.
2. **Cập nhật `SpeakingRoomsPage.tsx`**:
   - Chuyển `postgres_changes` sang TanStack Query polling (`refetchInterval: 5000`).
3. **Xóa bỏ `api/speaking-token.ts`**:
   - Loại bỏ serverless function cũ do đã tích hợp vào NestJS backend.
4. **Giữ nguyên**:
   - `useVoiceRoom.ts` (WebRTC signaling qua Supabase Broadcast).
   - `WordShooterLobby.tsx` và `WordShooterArena.tsx` (PvP qua Supabase Broadcast).

---

## 5. Kết luận
- **Phần bắt buộc phải đưa lên NestJS**: Toàn bộ thao tác CRUD phòng nói, tham gia/rời phòng, tính giờ đàm thoại và cấp token LiveKit. Đây là những điểm phụ thuộc trực tiếp vào `auth.uid()`, RLS và database transaction.
- **Phần giữ nguyên Supabase Realtime Broadcast**: Tín hiệu WebRTC Mesh trong `useVoiceRoom.ts` và toàn bộ cơ chế PvP trong `WordShooter`. Các tính năng này là truyền thông điệp ephemeral không phụ thuộc Supabase Auth, hoàn toàn có thể tiếp tục hoạt động với Anon Key hiện tại mà không làm gián đoạn trải nghiệm người dùng hay kéo dài thời gian refactor.
- **Không có thay đổi mã nguồn trong task T-030** (đúng theo yêu cầu BRIEFS.md).
