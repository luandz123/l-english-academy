# Rà soát UI/UX phía học viên

Bắt đầu: 2026-11-02 (rà soát), 2026-11-03 (sửa đợt 1). Luật giai đoạn: `AGENTS.md` → "Luật giai đoạn UI/UX".

Cách rà soát: chạy app cục bộ (Postgres + NestJS + Vite) với dữ liệu demo, Playwright đi qua ~30 trang ở 1440px và 390px với 3 vai (khách, học viên, học viên PRO), bấm thử các luồng chính. Báo cáo có ảnh: https://claude.ai/artifact/WNchP1CZAeNeU5wRKX8qG8 (riêng tư, chủ dự án chia sẻ nếu cần).

## Quyết định của chủ dự án (2026-11-03)

| # | Quyết định |
|---|---|
| D1 | Chuyển hẳn sang giai đoạn tối ưu UI/UX, được sửa giao diện. |
| D2 | Số liên hệ chính thức: **0334 729 066** (hotline + Zalo). |
| D3 | Bỏ "Bài kiểm tra đầu vào 15 phút" trên Bàn học. |
| D4 | Bỏ danh sách bạn bè giả ở trang Trò chơi. |
| D5 | Đăng nhập xong vào **Bàn học** (`/dashboard`). |
| D6 | (2026-11-03) **Bỏ gói nâng cấp PRO/VIP**, chuyển thanh toán sang **mua từng khóa học**. |
| D7 | (2026-11-03) Làm luôn **Phòng luyện nói** (module backend T-031 + frontend T-032). |
| D8 | (2026-11-03) Banner trang chủ dùng **nền động** (bầu trời đêm có sao băng, núi và rừng thông) với nội dung thật đặt lên trên, thay tấm ảnh có chữ vẽ sẵn. |
| D9 | (2026-11-03) Nền banner **do admin cấu hình** (tải ảnh/GIF/video hoặc dán link, bật/tắt, độ tối, thứ tự) và **tự chuyển** giữa các nền theo số giây admin đặt. |
| D10 | (2026-11-07) Tính năng `/part2-coach` gọi thống nhất là **"Luyện nghe từng bước"**, quảng cáo đúng **7 bước** (bỏ chữ "8 bước"; xóa component bẫy ETS không dùng). Làm lần lượt 4 đợt cải tiến ở mục "Luyện nghe từng bước" bên dưới. |

## Trạng thái từng mục

✅ đã sửa · ⏸️ chưa sửa (lý do ghi kèm)

### Nghiêm trọng
| ID | Vấn đề | Trạng thái | File |
|---|---|---|---|
| C1 | Khách chưa đăng nhập thấy QR + mã đơn ngẫu nhiên (không có trên server); nút đăng nhập dẫn tới `/auth` (404) | ✅ Khách chỉ thấy "Đăng nhập / Tạo tài khoản" (quay lại trang cũ sau khi đăng nhập); QR, số tài khoản chỉ hiện khi đã đăng nhập. Nút "[Thử nghiệm] Giả lập thanh toán" chỉ hiện khi `VITE_PAYMENT_SIMULATION=true` | `src/components/UpgradeProModal.tsx` |
| C2 | "Bài kiểm tra đầu vào 15 phút" mở đề 200 câu | ✅ Bỏ (D3) | `src/pages/DashboardPage.tsx` |
| C3 | Nút trong ảnh banner không bấm được; hotline trong ảnh sai số | ✅ Ảnh: số 0334 729 066 + QR Zalo mới (đã giải mã kiểm tra = `https://zalo.me/0334729066`). Thêm vùng bấm trong suốt trùng nút "Bắt đầu thi thử", "Xem gói VIP", ô hotline | `src/assets/hero-banner-new.jpg`, `src/components/landing/HeroCarousel.tsx` |
| C4 | "Khóa học của tôi" hiện số bài (156/43/40), tên bài, "15 phút" viết cứng | ✅ Chỉ hiện tiến độ khi khóa có bài giảng thật; khóa đề thi/flashcard vào đúng trang (`/fulltest`, `/vocab`); nhãn theo `course_type` | `src/pages/MyCoursesPage.tsx` |
| C5 | Ô tìm kiếm trang chủ và Bàn học không tìm | ✅ Kho khóa học có ô tìm thật (không phân biệt dấu, đồng bộ `?search=`); Bàn học và trang chủ chuyển tới đó; khách được mời đăng nhập rồi quay lại đúng kết quả | `src/pages/LibraryPage.tsx`, `src/utils/searchText.ts`, `src/components/landing/Navbar.tsx` |
| C6 | Khách vào /games thấy "Đăng xuất", "Học Viên VIP"; bạn bè giả, biểu đồ "+15%" | ✅ Khung trang hiện "Khách" + nút Đăng nhập; bỏ danh sách bạn bè giả (D4) và biểu đồ tuần viết cứng (cùng loại số liệu giả, luật UI/UX số 5) | `src/components/StudentLayout.tsx`, `src/pages/GamesHub.tsx` |

### Cao
| ID | Vấn đề | Trạng thái | File |
|---|---|---|---|
| H1 | Breadcrumb hiện ID, chữ tiếng Anh, "Khóa học" đưa về trang chủ | ✅ Bỏ đoạn ID, nhãn tiếng Việt, "Khóa học" → `/my-courses`, đoạn không có trang riêng không còn là link | `src/components/StudentLayout.tsx` |
| H2 | Một tính năng nhiều tên | ✅ Thống nhất: "Chép Chính Tả" (`/listening`), "Phản Xạ Part 2" (`/part2-coach`) | `StudentLayout.tsx`, `landing/Navbar.tsx`, `landing/Footer.tsx`, `LevelDetailsModal.tsx` |
| H3 | Học xong / onboarding đẩy về trang chủ marketing | ✅ Về `/my-courses` (học xong, nút Thoát) và `/library` (onboarding) | `src/pages/LearnPage.tsx`, `src/components/OnboardingModal.tsx` |
| H4 | Đăng nhập xong vào Hồ sơ; đăng xuất mỗi nơi một kiểu | ✅ Vào `/dashboard` (D5) cả email, Google, đăng ký; đăng xuất trong app về `/` như trang chủ | `Login.tsx`, `AuthCallback.tsx`, `Register.tsx`, `StudentLayout.tsx` |
| H5 | Streak 0 ở thanh trên, 1 ở thân trang (`streak \|\| 1`); "Hạng #01" khi chưa học | ✅ Dùng số thật; chưa có thời gian học → "Chưa xếp hạng" | `src/pages/DashboardPage.tsx` |
| H6 | Phòng thi: tab "Part 1 · 0/0 câu" sáng trong khi câu hiện là Part 5 | ✅ Chỉ hiện tab Part có câu; tab đang chọn luôn là Part có câu | `src/pages/FullTestExam.tsx` |
| H7 | Tên nhiệm vụ hằng ngày bị cắt còn "Đăn…" | ✅ Cho xuống dòng | `src/pages/DashboardPage.tsx` |
| H8 | Link footer sai chỗ, "Điều khoản" `href="#"`, icon MXH trỏ trang chủ TikTok/FB/YT | ✅ Đổi nhãn đúng đích, bỏ link chết, icon MXH chỉ hiện khi admin đã nhập URL | `src/components/landing/Footer.tsx` |

### Trung bình
| ID | Vấn đề | Trạng thái | File |
|---|---|---|---|
| M1 | Đáp án bị ẩn "••••" theo tên bài kể cả khi không có audio; nhãn "MULTIPLE_CHOICE" | ✅ Chỉ ẩn khi có audio; nhãn "Trắc nghiệm" / "Part N" | `src/pages/QuizPage.tsx` |
| M2 | Khóa từ vựng chưa có chủ đề: "chọn ở cột bên trái" nhưng cột trống | ✅ Thông báo "Khóa này chưa có chủ đề" + nút chơi game từ vựng | `src/pages/VocabPage.tsx` |
| M3 | Hộp xác nhận nộp bài tô xanh "0/3" | ✅ Màu cảnh báo khi còn câu trống. ⏸️ Toast "+XP" che nút "Xem giải chi tiết": chưa sửa (đụng toaster toàn app) | `src/pages/QuizPage.tsx` |
| M4 | Hồ sơ: "Huy hiệu gần nhất" khi 0/4; số câu 12.676 viết cứng | ✅ "Huy hiệu đầu tiên cần đạt"; bỏ số mặc định viết cứng | `src/pages/Profile.tsx` |
| M5 | Lẫn tiếng Anh kỹ thuật ("Cockpit", "Quick Presets", "Result") | ✅ Phần lớn đã đổi | nhiều file |
| M6 | Quá nhiều nút mời mua trên Bàn học | ⏸️ Chờ chủ dự án chọn nút chính | — |
| M7 | Vùng bấm nhỏ trên điện thoại, tiêu đề bài bị cắt | ✅ Link đăng nhập/đăng ký/quên mật khẩu ≥ 40px, nút hiện mật khẩu 40px, nút độ khó game, nút menu; ẩn chip XP trên thanh bài học ở mobile | `Login.tsx`, `Register.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `GamesHub.tsx`, `StudentLayout.tsx`, `LearnPage.tsx` |
| M8 | "Bài tiếp theo" đưa vào bài PRO không báo trước | ✅ Biểu tượng khóa trên nút khi bài kế tiếp cần PRO | `src/pages/LearnPage.tsx` |

## Lỗi chức năng tìm thấy khi kiểm tra code (2026-11-03)

| ID | Vấn đề | Trạng thái |
|---|---|---|
| F1 | Video YouTube: bài tập bật lên giữa video đếm giờ từ lúc mở trang, không theo video đang phát | ✅ Đọc thời gian phát thật qua YouTube iframe API (postMessage), tạm dừng video khi bài tập bật lên; link `youtu.be`, `shorts`, `live`, `?t=` đều nhúng đúng. Video không phải YouTube giữ cách cũ. `src/utils/youtube.ts` (+ test) |
| F2 | PvP: người bị hạ có nhiều kill hơn được tính "thắng" và **không gửi** tín hiệu kết thúc → đối thủ chơi mãi | ✅ Luôn báo khi bị hạ ở máy mình. `WordShooterArena.tsx` |
| F3 | PvP: đối thủ đóng tab giữa trận → trận không bao giờ kết thúc | ✅ Heartbeat 3 giây; im lặng 15 giây → báo đối thủ rời trận, tính thắng |
| F4 | PvP giao hữu: kết thúc trận gọi `getPlayerRank()` chưa import → lỗi, không hiện kết quả | ✅ Import |
| F5 | PvP xếp hạng: ghép được đối thủ gọi `gameSound.playLevelUpSound()` không tồn tại → kẹt ở "đã tìm thấy" | ✅ Dùng `playReadySound()`. `WordShooterLobby.tsx` |
| F6 | PvP phòng chờ: khách gửi "đã vào" 1 lần, không biết chủ phòng có nhận; sai mã phòng thì chờ mãi; tên hai bên luôn là "Người chơi 2"/"Chủ phòng" | ✅ Gửi lại mỗi 3 giây tới khi chủ phòng xác nhận, hiện "Đang kết nối…", báo sau ~15 giây nếu chưa thấy phòng; gửi tên thật |
| F7 | `FullTestList` dùng `EmptyState` chưa import → khóa đề rỗng làm trang lỗi; `VocabLessonPage` sai prop nên không hiện nút | ✅ |
| F8 | Đăng nhập Google: server chưa cấu hình trả trang JSON 503 thô | ✅ Frontend kiểm tra trước, báo "Đăng nhập Google đang tạm tắt…". Chủ dự án đã cấu hình `GOOGLE_CLIENT_ID/SECRET` trên Render, **đăng nhập Google chạy trên production** (2026-11-03) |
| F9 | Backend sập khi khởi động nếu `.env` có biến để trống (`GOOGLE_CLIENT_ID=`, `SEPAY_WEBHOOK_API_KEY=`…) | ✅ Biến rỗng coi như chưa đặt và bị xóa khỏi `process.env` (vì `ConfigService.get` đọc `process.env` trước) — `backend/src/config/env.schema.ts` + test |
| F10 | Vercel function thanh toán cũ (`api/payment-webhook.ts`, `check-payment.ts`, `simulate-payment.ts`) vẫn được deploy, dùng Supabase và anon key viết cứng; trang admin hiển thị URL webhook cũ | ✅ Xóa (chủ dự án yêu cầu); trang cài đặt hiển thị và kiểm tra webhook mới `/api/v1/payments/webhooks/sepay` (OPEN_QUESTIONS #30) |
| F11 | Phòng luyện nói: nút "Tạo phòng và bắt đầu nói" bị khóa (mờ) cho tới khi nhập tên phòng mà không báo gì | ✅ Nút luôn bấm được; thiếu tên → báo lỗi ngay dưới ô tên và đưa con trỏ vào ô (`SpeakingCreateRoomCard.tsx`) |
| F12 | Banner trang chủ là ảnh tĩnh có chữ và nút vẽ sẵn (khó đọc trên điện thoại) | ✅ D8: `HeroCarousel.tsx` dựng nền động bằng CSS/SVG (12 sao băng, 70 sao lấp lánh, núi, rừng thông, sương), chữ/nút/hotline là HTML thật; QR Zalo ảnh nét riêng (`zalo-qr.png`); tắt chuyển động khi máy bật giảm chuyển động. Ảnh mẫu chủ dự án gửi chỉ còn 1 khung hình và 400×300 px nên dựng lại bằng code |
| F13 | D9: cấu hình `hero_banner` trong `homepage_showcase_config` (`normalizeHeroBanner` lọc mục lỗi, luôn còn ≥ 1 nền); admin: khối "Nền Banner Đầu Trang Chủ" ở tab Kệ Trang Chủ (`HeroBannerManager.tsx`, tải lên thư mục `uploads` qua API media sẵn có); trang chủ chuyển mờ dần giữa các nền, chấm chọn nền, dừng khi rê chuột/tab ẩn/giảm chuyển động | ✅ |

### Bật đăng nhập Google (việc của chủ dự án, không sửa bằng code)
1. Google Cloud Console → project L-English → **APIs & Services → Credentials → Create credentials → OAuth client ID** → loại *Web application*.
2. *Authorized redirect URIs*: `https://<domain production>/api/v1/auth/google/callback` (đúng `FRONTEND_URL` trên Render + `/api/v1/auth/google/callback`).
3. OAuth consent screen: chuyển **In production** (chế độ Testing chỉ cho email trong danh sách test).
4. Render → service `lenglish-api` → Environment: thêm `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` → Save (Render tự deploy lại).

## Mua từng khóa học thay gói PRO (D6)

- Backend `POST /api/v1/payments/orders` nhận `{ course_id }`: giá lấy từ `courses.price` ở server; khóa miễn phí → 400 `COURSE_NOT_FOR_SALE`; đã sở hữu → 409 `ALREADY_ENROLLED`; khóa ẩn/không có → 404; dùng lại đơn pending cùng khóa trong 30 phút. Tiền về đủ → **chỉ ghi danh khóa đó** (không bật PRO).
- Đơn `vip_combo` cũ còn pending vẫn kích hoạt như trước (PRO + mọi khóa) để không mất tiền ai đã chuyển. Học viên PRO cũ vẫn giữ quyền vì đã được ghi danh mọi khóa.
- Frontend: `CoursePurchaseModal` (QR SePay, tự theo dõi đơn, "Vào học ngay" khi xong) mở từ màn bài học bị khóa và màn Full Test chưa sở hữu. Bỏ nút/thẻ "Nâng cấp PRO", mục "Nâng cấp VIP trọn đời" ở trang chủ, link VIP ở navbar/footer/thanh dưới điện thoại; chữ trong ảnh banner đổi thành "Xem khóa học & Lộ trình".
- Cần chủ dự án: đặt **giá cho từng khóa trả phí** ở trang admin (khóa giá 0 và không đánh dấu miễn phí sẽ không mua được). Phần "Gói VIP" trong trang cài đặt admin giờ chỉ còn dùng thông tin tài khoản ngân hàng (tên ngân hàng, số tài khoản, chủ tài khoản, Zalo). Câu hỏi thường gặp (FAQ) do admin nhập có thể còn nhắc tới VIP, cần sửa ở trang cài đặt.

## Phòng luyện nói (D7)

- Backend module `speaking` (migration `20261103000000_speaking_rooms`): danh sách/chi tiết/tạo/vào/rời/đóng phòng, ghép cặp, thống kê thời gian nói, đổi trình độ, cấp token âm thanh. Quyền thay RLS cũ: mã phòng riêng tư chỉ chủ phòng thấy (bản Supabase cũ trả cả mã cho mọi người), chỉ chủ phòng đóng phòng, token chỉ cấp cho thành viên đã vào phòng, vào phòng khóa dòng để không vượt sĩ số.
- Frontend: `src/lib/api/speaking.ts`; `speakingService.ts` giữ chữ ký hàm cũ nhưng gọi backend; danh sách phòng tự làm mới mỗi 5 giây. Xóa `api/speaking-token.ts`.
- Âm thanh: có `LIVEKIT_API_KEY/SECRET/URL` trên Render → dùng LiveKit (khuyên dùng, ổn định hơn); không có → WebRTC mesh qua STUN công khai, tín hiệu đi qua Supabase Realtime Broadcast (giữ theo T-030). Mesh có thể không nối được khi cả hai bên ở sau NAT chặt (không có TURN).

## Luyện nghe từng bước (D10, 2026-11-07)

| # | Vấn đề | Đã làm | Trạng thái |
|---|---|---|---|
| L1 | Trong một bài, menu "Chép Chính Tả" sáng cùng "Phản Xạ Part 2" (mã bài có chữ `dictation-`) | `StudentLayout.tsx`: loại `/part2-coach` khỏi điều kiện Chính tả; breadcrumb hiện "Bài đang học" thay mã bài | ✅ |
| L2 | Khung tiêu đề dính (sticky) lệch 56px, đè lên dòng đầu của mỗi bước (cả desktop) | `main` dùng `overflow-x-clip` thay `overflow-x-hidden` (hidden biến `main` thành khung cuộn nên `top-16` bị cộng thêm) | ✅ |
| L3 | Gợi ý phím tắt (Space/R/←→) hiện trên điện thoại | Ẩn dưới 768px | ✅ |
| L4 | Điện thoại chỉ thấy "Bước 1/7", không nhảy bước được | 7 ô bước bấm được (cao 40px), ô xong có dấu ✓ | ✅ |
| L5 | Bước 7: 2 nút chỉ có biểu tượng, nút tốc độ/phụ đề nhỏ | Thêm `aria-label`, nút cao 40px trên điện thoại; nút Phát không xuống dòng | ✅ |
| L6 | Một tính năng 3 tên, "8 bước" vs 7 bước thật | Đổi tên ở menu, trang tổng, footer, banner Part 2, kệ trang chủ, admin, modal cấp độ; hàng TỪ VỰNG trên banner trang chủ không còn nói "phản xạ âm 8 bước". Banner Part 2 và kệ khóa học **đã lưu trong DB** vẫn giữ chữ cũ đến khi admin sửa ở tab Kệ trang chủ | ✅ |
| L7 | Tên bài "Bài 02: Câu 1 – 5" không nói nội dung; số câu trông như chồng nhau (bài 3 "Câu 6–10", bài 7 "Câu 7–11") | Tên bài ghép từ dạng câu hỏi trong bài (vd. "Where · Why · Câu trần thuật"); dòng nguồn ghi rõ "Bài nghe điền từ · Câu 1–5" / "Đề Fulltest 01 · Câu 7–11" | ✅ |
| L8 | Nhãn độ khó sai: "Trung cấp (650+)" hiện "Nâng cao", "Nâng cao (800+)" hiện "Cơ bản" | Hiện đúng `difficulty` của dữ liệu | ✅ |
| L9 | Trang tổng nói "cụm 5 câu" nhưng Bài 01 có 2 câu; tiêu đề dài 2 dòng | Tiêu đề "Luyện Nghe Từng Bước", mô tả tính số câu thật (2–5), có dải 7 bước | ✅ |
| L10 | Tên bước khó hiểu ("PX Hỏi", "PX Đáp") và không có hướng dẫn | Tên ngắn mới: Hiểu câu hỏi, Bật câu đáp, Nhại theo, Làm thử đề, Nghe lặp; mỗi bước có 1 câu hướng dẫn thao tác (`howTo`) ở đầu bước | ✅ |
| L11 | Không có lối "học tiếp" | Nút "Học tiếp / Bắt đầu học" ở đầu trang tổng (bài mở gần nhất, đúng bước còn dở) + thanh tiến độ chung "Đã xong x/25 bài" | ✅ |
| L12 | Xong một bước tự nhảy bước, không có phản hồi | Thẻ "Xong bước N" (tiến độ 7 ô, giới thiệu bước sau, nút "Sang bước N+1" / "Ôn lại bước này") | ✅ |
| L13 | Thẻ bài khó phân biệt trạng thái | Nhãn "Hoàn thành ✓", "Đang học x/7", "Nên học tiếp"; viền màu theo trạng thái; cả thẻ là nút bấm được bằng bàn phím | ✅ |
| L14 | Tiến độ chỉ ở trình duyệt, đổi máy là mất | API `GET/PUT /api/v1/learning/listening-steps/progress` (bảng `user_listening_step_progress`); server gộp bước đã xong, không xóa; tiến độ cũ trong trình duyệt tự đẩy lên lần đầu | ✅ |
| L15 | Shadowing chỉ hiện % | Thêm 1–3 sao và lời nhắc theo điểm (60/75/90%) | ✅ |
| L16 | XP vẫn tính ở trình duyệt | **Chưa đổi**: toàn bộ XP/level/streak (`useGamification`) đang lưu ở trình duyệt, không riêng Part 2. Chỉ chặn cộng lại 200 XP khi server đã ghi nhận bài xong ở máy khác. Chuyển XP lên server là việc riêng, cần chủ dự án quyết | ⏳ |

