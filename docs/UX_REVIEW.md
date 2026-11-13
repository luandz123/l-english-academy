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
| D11 | (2026-11-08) Chép chính tả: bấm **"Xem đáp án" không tính là đã làm câu** (không lưu tiến độ, không XP). |
| D12 | (2026-11-09) Làm tính năng mới **Lộ trình học** (wizard 4 bước). Bài test nhanh dùng **một quiz admin chỉ định**; chủ điểm/đề luyện **gắn với khóa, chương, bộ từ vựng, đề có sẵn**; lộ trình **lưu DB, xem lại ở Bàn học**. Khác D3: bài test nằm trong wizard, là quiz ngắn do admin chọn, không phải đề 200 câu trên Bàn học. |
| D13 | (2026-11-09) Làm nhóm **Luyện đề ưu tiên 1** (E03/L02/R02 luyện theo dạng câu, E05 bộ lọc thư viện đề, R07/L09 Sổ câu sai, E07 đề yêu thích, E04 Mini Test + Daily Challenge, E06 đề đã xác minh). Chốt: **nhãn dạng câu do script gắn tự động, admin sửa được**; câu luyện **theo quyền đề nguồn** (cùng luật FULLTEST_LOCKED); trang **/practice** (tab Listening/Reading) + lối vào ở /listening, /fulltests, Bàn học, menu; **chỉ admin** xác minh đề, học viên **báo lỗi** được; lượt luyện **cộng XP như Quiz**; Daily Challenge **riêng từng người**. |
| D14 | (2026-11-10) Làm nhóm **Ưu tiên 2 – Phân tích và cá nhân hóa** (P11 phân tích điểm yếu, P10 tiến độ, E09 so sánh lần làm đề, P01 bài kiểm tra trình độ, P03 lộ trình theo điểm yếu, E10 đề xuất đề). Chốt: **giữ nguyên mọi con số giả định mục 7** của đặc tả; bài chẩn đoán **hệ thống tự rút bộ ~50 câu cố định** từ kho đã gắn nhãn, **miễn phí cho mọi tài khoản**, admin tạo lại được; **Mini Test không quy đổi điểm**; "Việc tuần này" **chỉ tự động**, không tick tay; route `/analysis`, `/progress`, `/diagnostic`, `/fulltests/compare`; "Làm chậm" dùng **thời gian từng câu server ước tính** từ nay (dữ liệu cũ, Full Test không có); hết câu chưa làm → ôn câu sai theo đặc tả. |

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


## Hồ sơ cá nhân (2026-11-08)

| # | Vấn đề | Đã làm | Trạng thái |
|---|---|---|---|
| H1 | Không đổi được ảnh đại diện: ảnh chụp điện thoại > 5MB hoặc đuôi lạ (.jfif) bị API từ chối → trang lưu ảnh dạng base64 (dài hơn giới hạn 2000 ký tự) → server từ chối nhưng trang **bỏ qua lỗi và vẫn báo thành công** | Thu nhỏ ảnh trên trình duyệt (`src/lib/imageResize.ts`: avatar cắt vuông 512px, bìa 1600px, JPEG); bỏ base64; kiểm tra lỗi từng bước lưu; nạp lại hồ sơ để ảnh đổi ngay cả trên thanh trên cùng | ✅ |
| H2 | Ảnh đại diện lệch trái so với ảnh bìa; nút đổi ảnh chỉ hiện khi rê chuột (điện thoại không thấy) | Ảnh tròn căn giữa đè mép dưới ảnh bìa, tên/cấp độ/ngày tham gia/giới thiệu/nút sửa ở giữa; nút máy ảnh luôn hiện; ảnh bìa lỗi thì hiện nền gradient | ✅ |
| H3 | API thống kê trả **số bịa** khi đếm được 0 (24.382 câu, 12.676 câu nghe, 11.706 câu đọc, 55 đề, 1.500 học viên, 12 khóa) — hồ sơ hiện "0/12,676" cạnh "Kho câu hỏi: 9" | Backend trả số đếm thật; câu nghe = câu có audio riêng hoặc thuộc bài có audio; test e2e | ✅ |
| H4 | Lịch sử bài hiện "điểm/10" nhưng bài chép chính tả lưu `score` = số câu đã làm; nhãn "Hoàn thành" cho bài 0% | Hiện "x/y câu (z%)" từ số câu đúng do server chấm; nhãn "Đạt ≥70%" / "Đạt 650+" / "Cần luyện thêm" | ✅ |
| H5 | Chuỗi học tập lấy từ bộ đếm trong trình duyệt, "chuỗi dài nhất" trộn số trình duyệt; lịch hoạt động cắt ngày theo giờ UTC (làm bài 0h–7h sáng bị tính sang hôm trước) | Chuỗi hiện tại/dài nhất tính từ bài đã nộp trên server, theo giờ máy người học | ✅ |
| H6 | Vòng tròn "đã giải" luôn tối thiểu 2% dù chưa giải câu nào; số đề mặc định 55 | Bỏ | ✅ |
| H7 | Lời giới thiệu mặc định "Quyết tâm chinh phục TOEIC 800+" như người dùng tự viết; khối "Kỹ năng đã luyện" lặp lại "Thống kê bài giải"; email hiển thị trong thẻ | Không có lời giới thiệu thì ghi "Chưa có lời giới thiệu."; bỏ khối lặp và dòng email | ✅ |
| H8 | Lịch hoạt động tràn ngang, cắt chú thích "Nhiều hơn" | Lưới 52 tuần co giãn theo bề rộng thẻ | ✅ |
| H9 | Cấp độ, XP, huy hiệu vẫn lưu trong trình duyệt (`useGamification`) | Chưa đổi — cùng việc L16, cần chủ dự án quyết | ⏳ |

## Chép chính tả (2026-11-08)

| # | Vấn đề | Đã làm | Trạng thái |
|---|---|---|---|
| C1 | Nộp bài khi chưa làm câu nào vẫn +10 XP, mở rương, bài học trong khóa bị đánh dấu hoàn thành, +1 câu vào huy hiệu; nộp lại bao nhiêu lần cũng cộng XP; không hỏi lại | XP chỉ tính câu **tự làm đúng trong lượt này**; hỏi lại khi còn câu chưa làm; bài học chỉ hoàn thành khi đã làm hết các câu; màn kết quả hiện đúng số XP đã cộng | ✅ |
| C2 | "Xem đáp án" (nút dưới, nút trong câu, Alt+A) tính câu là đã làm + XP | D11: hiện thẻ đáp án + bản dịch, ghi "không tính", có nút "Tự làm lại câu này"; không gọi API đánh dấu xong; kết quả ghi "Đã xem đáp án (không tính)" | ✅ |
| C3 | Bấm riêng phím Ctrl là phát/dừng audio (đụng Ctrl+Backspace/Ctrl+A khi gõ) | Chỉ còn Alt+Space; gợi ý phím tắt ẩn trên điện thoại | ✅ |
| C4 | Gõ cả câu: sai 1 từ là hiện cả câu đáp án + nút "Điền đáp án đúng" | Gợi ý tăng dần: lần 1 chỉ ra từ thứ mấy sai, lần 2 hiện chữ cái đầu, từ lần 3 hiện từ đó; cả câu chỉ hiện khi bấm "Xem đáp án" | ✅ |
| C5 | Thanh nút dưới chồng chữ ("Đã làm 0" đè "Xem đáp án"), tràn trên điện thoại | Dòng "Đã làm x/y câu" tách riêng; nút cao 44px, lưới 2×2 trên điện thoại | ✅ |
| C6 | Trong trang khóa học phải cuộn mới thấy "Bắt đầu luyện"; có thể bấm tay "Hoàn thành bài học" cho bài chép chính tả | Nút bắt đầu dính đáy (máy tính) / thanh cố định đáy màn hình (điện thoại); bài chép chính tả không còn nút hoàn thành tay, ghi "Làm hết các câu để hoàn thành bài" | ✅ |
| C7 | Kéo thả: vừa xếp đủ đã tự chấm, dấu ✕ (nút gỡ) hiện sẵn như báo sai | Chỉ chấm khi bấm "Kiểm tra đáp án" (bật khi điền đủ); báo "N từ đặt sai chỗ…"; dấu gỡ chỉ hiện khi rê chuột | ✅ |
| C8 | Gõ từ khóa: sai chỉ hiện "!"; **bấm Enter lần 2 là tự điền đáp án và tính đúng**; ô trống ghi "..." | Enter chỉ kiểm tra lại; ô ghi "7 chữ"/"2 từ"; gợi ý tăng dần: "Chưa đúng…" → chữ cái đầu → chữ đầu và cuối | ✅ |
| C9 | Màn chuẩn bị dày: lưới chọn từng câu luôn mở, khung "0 từ vựng" vẫn hiện | Lưới chọn câu thu gọn sau nút "Chọn từng câu"; khung từ vựng chỉ hiện khi có; câu dẫn nói rõ mặc định 5 câu chưa làm | ✅ |
| C10 | Khung "Từ vựng trong câu" trống vẫn chiếm chỗ; nút "Xem đáp án (Alt+A)" trong câu đè chữ trên điện thoại và trùng nút dưới | Ẩn khung khi trống; bỏ nút trong câu (chỉ còn nút ở thanh dưới) | ✅ |
| C11 | Hai nơi mở cùng một bài (trong trang khóa học và trang riêng sau bài từ vựng); "Quay lại" từ trang riêng mở bài đầu tiên chưa xong | Giữ trang riêng cho luồng "Luyện nghe các câu này" sau bài từ vựng; "Quay lại" mở đúng bài (`/courses/:id/learn?quiz=<id>`, tham số mới, không đổi route) | ✅ |
| C12 | Nhiều tên: "Chép Chính Tả", "Luyện Nghe Điền Từ (Dictation)", "Luyện nghe điền từ"; mô tả hứa "Part 1–4, mượt mà" | Thống nhất "Chép chính tả" ở danh sách, trong bài, cài đặt, footer; mô tả nói đúng 3 cách làm | ✅ |

## Lộ trình học (D12, 2026-11-09)

Nhánh `feature/roadmap`. Route mới `/roadmap` (menu "Lộ trình học"), thẻ "Lộ trình của bạn" ở cột phải Bàn học.

| Bước | Nội dung |
|---|---|
| 1. Điểm xuất phát | Tự khai điểm (chip + ô nhập 10–985), "Chưa thi / Mất gốc" (server coi là 150), hoặc bài test nhanh. Bài test chỉ hiện khi admin đã nhập ID quiz ở Cài đặt → Nền tảng và học viên có quyền làm quiz đó (nên chọn quiz miễn phí). Đi làm bài thì nháp wizard giữ trong `sessionStorage`; trang kết quả quiz có nút "Quay lại tạo lộ trình". Điểm ước lượng do server tính từ kết quả đã chấm (trần 900). |
| 2. Mục tiêu | Chip 450–900 hoặc nhập số (300–990, bội số 5, phải cao hơn điểm xuất phát); mục đích: tốt nghiệp, xin việc, thăng chức, nâng phản xạ. |
| 3. Quỹ thời gian | Tổng thời gian (1/2/3/4/6 tháng) hoặc ngày thi (cách hôm nay 2 tuần – 2 năm); phút mỗi ngày (30/60/90/120); số ngày rảnh mỗi tuần (1–7). |
| 4. Kết quả | Tổng giờ cần học, quỹ giờ, số tuần, tuần hiện tại; cảnh báo khi thiếu thời gian (điểm có thể đạt, số phút/ngày nên học); các chặng theo dải điểm (Nền tảng / Bứt phá 300–500 / Tăng tốc 500–700 / Chinh phục 700–850 / Về đích 850+) + chặng Luyện đề tổng hợp, mỗi chặng có số tuần, ngày, giờ, tỷ trọng Nghe/Đọc/Ngữ pháp/Từ vựng, chủ điểm ngữ pháp, từ vựng, cách luyện và link tới chương "Part N", bộ từ vựng, đề full có sẵn. |

Cách tính (server, `backend/src/modules/roadmap/roadmap-planner.ts`): giờ cho mỗi 100 điểm theo dải (dưới 300: 60h, 300–500: 80h, 500–700: 110h, 700–850: 150h, trên 850: 220h), cộng 15% cho luyện đề. Các con số này là ước lượng của nhóm phát triển, chủ dự án có thể chỉnh trong file đó.

Kiểm tra tay (Postgres tạm + dữ liệu mẫu, 1440px và 390px): tạo lộ trình từ bài test nhanh 3/4 câu → xuất phát 650; chặng, chủ điểm, link chương hiện đúng; không cuộn ngang ở 390px; thẻ Bàn học hiện chặng hiện tại và tuần.


## Luyện đề ưu tiên 1 (D13, 2026-11-09)

Nhánh `feature/exam-practice`. Module backend mới `PracticeModule` (`backend/src/modules/practice/`).

| Mã | Tính năng | Ở đâu |
|---|---|---|
| E03/L02/R02 | Luyện theo dạng câu: chọn Part → một/nhiều dạng (số câu thật theo quyền) → số câu (5/10/15/20/tùy chỉnh), độ khó, Practice/Test, xem giải thích sau mỗi câu hoặc khi nộp, thứ tự. Thiếu câu → báo số câu hiện có + nút "Luyện N câu". Dạng không có câu thì ẩn. Part 7 phân cấp: Single/Double/Triple là nhóm chính, loại văn bản (email, quảng cáo, bài báo, thông báo, tin nhắn, biểu mẫu/lịch…) là bộ lọc phụ. | `/practice` (`/reading` → tab Reading), thẻ ở `/listening`, `/fulltests` |
| E05 | Thư viện đề: tìm theo tên/mã (LE-0052), lọc năm/độ khó/chủ đề/loại đề/kỹ năng/Part/trạng thái/Premium/xác minh (chọn nhiều), số đề phù hợp, xóa bộ lọc, sắp xếp mới nhất/phổ biến/độ khó/lượt làm, gợi ý bỏ bớt lọc khi không có kết quả. Lựa chọn lọc không có đề nào thì ẩn. | `/fulltests` (thay danh sách khóa cũ; trang đề theo khóa `/courses/:id/fulltest` giữ nguyên) |
| R07/L09 | Sổ câu sai: tự lưu câu sai khi nộp lượt luyện **và** Full Test; bookmark tay (cả câu đúng) trong lúc làm, ở kết quả, trong Full Test. Trạng thái Chưa ôn / Đang cải thiện / Đã sửa đúng; không xóa khi làm đúng; lịch sử từng lần trả lời. Lọc Listening/Reading, Part, trạng thái, 7/30 ngày, sai ≥ 2 lần, bookmark; luyện lại theo bộ lọc, câu chưa sửa, gần đây, nhiều lần, câu đã sửa (kiểm tra ghi nhớ). Nghe lại audio, đổi tốc độ, transcript; Reading giữ nguyên đoạn văn của nhóm. | `/mistakes` (menu "Câu hỏi sai của tôi"), thẻ Bàn học |
| E07 | Đề yêu thích: nút bookmark trên thẻ đề và màn chuẩn bị làm Full Test; trang danh sách lọc Full Test/Listening/Reading, ngày lưu; đề bị gỡ vẫn hiện "không còn khả dụng". | `/favorites`, thẻ Bàn học |
| E04 | Mini Test theo kỹ năng hoặc Part, 5/10/15/20/30 câu, giờ tự động hoặc tùy chỉnh, độ khó, Practice/Test; kết quả có điểm, đúng/sai, thời gian, TB mỗi câu, phân tích theo Part/dạng, luyện lại câu sai, làm lượt mới. Daily Challenge: 5 Listening + 5 Reading/ngày (giờ VN), xoay Part trọng tâm, ưu tiên dạng đang yếu, tránh câu đã gặp 7 ngày, chuỗi ngày. Mỗi lượt có mã riêng, lưu lịch sử. | `/practice?tab=mini`, `/practice/history`, thẻ Bàn học |
| E06 | Verified: admin duyệt checklist 9 mục (đủ mới xác minh), ngày xác minh hiện trên thẻ; sửa câu/đáp án/section của đề đã xác minh → trigger DB chuyển "Cần duyệt lại"; học viên báo lỗi câu/đề, admin xử lý. Ghi rõ Verified không phải đề ETS. | `/admin/exam-review` (menu admin "Kiểm duyệt đề") |

Gắn nhãn tự động (`question-tagger.ts`, có unit test): Part 1 theo người/đồ vật trong đáp án; Part 2 theo từ đầu câu hỏi (lấy từ transcript khi đề ghi "Mark your answer"); Part 3/4 theo câu hỏi (chủ đề, người nói, chi tiết, yêu cầu, hành động tiếp, suy luận, biểu đồ); Part 5/6 theo 4 lựa chọn (từ loại, thì, đại từ, giới/liên từ, từ vựng, chèn câu); Part 7 theo vị trí trong Part (đề đủ 54 câu) + loại văn bản theo câu dẫn "refer to the following …". Độ khó mặc định Trung bình (chưa có dữ liệu thật để tự đánh giá), admin sửa từng câu. Câu nghe dùng chung một file audio cho cả Part (> 5 câu) không đưa vào luyện riêng vì không phát riêng từng câu được (vẫn luyện lại được trong Sổ câu sai). Bộ gắn nhãn tự chạy nền khi khởi động và trước khi đọc kho câu nếu còn câu chưa gắn; câu bị sửa nội dung được gắn lại; nhãn admin sửa tay không bị ghi đè.

Kiểm tra tay (Postgres tạm cổng 5440 + 3 đề mẫu, 1440px và 390px): chọn Part 2 → WH 8 câu, báo "Chỉ có 8 câu" + nút đề xuất; làm lượt phản hồi ngay (đúng/sai, giải thích, transcript, nghe lại, 0.75x–1.25x, phím 1–4, ←/→); nộp → 1/8, sai 1, chưa trả lời 6, +10 XP; Sổ câu sai hiện câu sai; thư viện đề lọc và khóa đề Premium; admin mở checklist 0/9, nút Xác minh khóa.

Còn mở: nhãn tự động là quy tắc trên chữ — nên cho admin rà các đề thật trước khi quảng bá tính năng; độ khó và chủ đề đề thi đang trống tới khi admin nhập.

## Phân tích và cá nhân hóa (D14, 2026-11-10)

Nhánh `feature/analytics`. Module backend mới `AnalyticsModule` (`backend/src/modules/analytics/`), bổ sung ở `practice` (bài chẩn đoán, câu chưa làm, luyện theo danh sách câu, thời gian từng câu) và `roadmap` (cá nhân hóa).

| Mã | Tính năng | Ở đâu |
|---|---|---|
| P11 | Phân tích điểm yếu: cửa sổ 7/30/90 ngày/Toàn bộ, lọc kỹ năng; 3 dạng yếu nhất (≥ 10 câu, tối đa 2 dạng/Part) kèm tỉ lệ, chênh so với mức chung, xu hướng (±5 điểm %), "Bỏ trống nhiều", "Làm chậm"; theo Part (≥ 20 câu) → dạng câu, Part 7 thêm loại văn bản; "Luyện 10 câu dạng này" tạo thẳng lượt luyện câu chưa làm, hết câu → ôn câu sai, câu thuộc đề khóa → báo mở khóa; "Xem câu đã sai" mở Sổ câu sai lọc sẵn; "Vừa luyện: 7/10". Trạng thái trống / chưa đủ dữ liệu / gợi ý mở rộng cửa sổ. | `/analysis`, nút ở kết quả Full Test và kết quả lượt luyện |
| P10 | Tiến độ: điểm ước lượng (Full Test đủ 7 Part hoặc chẩn đoán gần nhất, nhãn cũ > 60 ngày), mục tiêu từ lộ trình, số câu 30 ngày, chuỗi ngày (cùng hàm với Hồ sơ); biểu đồ điểm Tổng/L/R + đường mục tiêu; Part 30 ngày so 30 ngày trước; 8 tuần hoạt động; điểm yếu hàng đầu; 10 lượt gần nhất có ô chọn so sánh; dòng tình hình lộ trình. | `/progress`, thẻ "Tiến độ của bạn" ở Bàn học |
| E09 | So sánh 2–3 lượt Full Test: điểm Tổng/L/R (chỉ so khi cả hai làm đủ), bảng Part, thời gian + bỏ trống, 3 dạng tăng/giảm mạnh nhất; cùng đề → Sai→Đúng / Đúng→Sai / Sai cả hai / Đúng cả hai, "Đáp án đã được cập nhật", "Luyện lại N câu này", "Lưu vào Sổ câu sai". | `/fulltests/compare`, nút "So sánh với lần trước" ở kết quả Full Test, ô chọn ở modal Lịch sử đề và Tiến độ |
| P01 | Bài kiểm tra trình độ: bộ câu tự rút theo cấu trúc P1 3 · P2 8 · P3 9 · P4 6 · P5 10 · P6 4 · P7 10 (nhóm giữ nguyên), 40 phút, chế độ Test; kết quả khoảng điểm L/R/Tổng (± sai số), bản đồ 7 Part, dạng yếu sơ bộ (≥ 3 câu); bỏ trống > 50% → không dùng được; làm tiếp/làm lại; gợi ý dùng Full Test ≤ 30 ngày. Thay bài test nhanh ở bước 1 wizard lộ trình (bài cũ chỉ còn dùng khi chưa có bộ câu). | `/diagnostic`, `/diagnostic/result/:id`, admin: `POST /practice/admin/diagnostic/regenerate` |
| P03 | Lộ trình cá nhân hóa: "Trọng tâm của bạn" (dạng yếu trong phạm vi chặng, hiện → cần 65%/75%), "Để dành cho chặng sau", tỉ trọng điều chỉnh tối đa ±15 điểm % kèm lý do, "Việc tuần này" chốt thứ Hai (luyện dạng yếu, ôn sổ câu sai, học chương, Mini Test/Full Test) với tiến độ tự tính; thông báo trọng tâm đổi, tuần trước chưa xong, điểm vượt chặng ("Chuyển sang chặng …"), đã đạt yêu cầu chặng. | `/roadmap`, thẻ lộ trình ở Bàn học ("Còn x/y việc") |
| E10 | Đề xuất đề tiếp theo: ưu tiên chưa làm (hoặc ≥ 30 ngày) → độ khó hợp mức → đã xác minh → yêu thích → mới thêm; chế độ đủ đề (chặng Luyện đề, Full Test gần nhất ≥ 14 ngày, chưa có điểm yếu) hoặc 2 Part chứa điểm yếu; lý do chỉ ghi tiêu chí khớp; "Không phải lúc này" ẩn 7 ngày; người mới → bài kiểm tra trình độ. "Bắt đầu" mở màn chuẩn bị Full Test với Part chọn sẵn (`?parts=`). | Bàn học (thay khối "Đề tiếp theo" cũ), kết quả Full Test, Tiến độ, dải "Gợi ý cho bạn" ở thư viện đề |

Ghi chú hợp đồng: `GET /roadmap/placement` thêm trường `diagnostic` (test e2e roadmap cập nhật); `FullTestResult` đọc thêm `?resultId=` và thêm id lượt vào queryKey `latest-fulltest-result` để không lấy nhầm cache; `DashboardPage` bỏ logic chọn "đề đầu tiên chưa làm".

Kiểm tra tay (Postgres tạm + 3 đề mẫu, 1440px và 390px): làm chẩn đoán + 3 lượt Part 5 + 2 lần Full Test bằng API rồi xem `/analysis` (3 điểm yếu, theo Part), `/progress` (điểm 625, −15/30 ngày, biểu đồ), `/diagnostic/result` (540–740, bản đồ Part), `/fulltests/compare` (+35 tổng, tab từng câu), `/roadmap` (trọng tâm Part 5, tỉ trọng điều chỉnh, việc tuần), Bàn học 390px (đề xuất "Làm Part 5 + 6", lý do) → màn chuẩn bị đề chọn sẵn Part 5, 6.

Còn mở: độ chính xác của phân tích phụ thuộc nhãn tự động (đã ghi ở D13); bài chẩn đoán lấy cả câu từ đề trả phí theo quyết định "miễn phí cho mọi tài khoản".
