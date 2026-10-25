# ADR 0005: Một RealtimeGateway Socket.IO dạng relay thay Supabase Realtime

- **Trạng thái**: Đã chấp thuận
- **Ngày**: 2026-10-25
- **Người quyết định**: Chủ dự án (DECISIONS D-21, C-05)
- **Tài liệu tham chiếu**: [DECISIONS.md](../DECISIONS.md)

---

## 1. Bối Cảnh
Supabase Realtime được dùng ở 4 nơi:
- Signaling WebRTC mesh của phòng nói (`useVoiceRoom.ts:334`, kênh `speaking-room:<id>`, broadcast `self: false`). Production chạy mesh vì chưa có `LIVEKIT_API_KEY`.
- Trạng thái phòng nói (`SpeakingRoomsPage.tsx:102`, `postgres_changes`).
- PvP Word Shooter client-to-client (`WordShooterLobby.tsx:456`, `WordShooterArena.tsx:777`, kênh `lobby-pvp-*`, `arena-pvp-*`).
- Trạng thái đơn thanh toán (`UpgradeProModal.tsx:163`) → xử lý bằng SSE trong PaymentsModule.

## 2. Quyết Định
- Một `RealtimeGateway` (Socket.IO) giữ đúng ngữ nghĩa Broadcast: `join(channel)`, `leave(channel)`, `send(channel, event, payload)` tới mọi thành viên khác trong kênh. Server **không** diễn giải nội dung (không chấm điểm PvP, không can thiệp SDP).
- Xác thực bằng access token trong handshake; quyền vào kênh theo từng loại kênh.
- Frontend: `src/lib/api/realtime.ts` mô phỏng API `channel().on().subscribe().send()` để hook chỉ đổi dòng tạo channel.
- Trạng thái phòng (`postgres_changes`) → server phát sự kiện vào kênh sau khi join/leave/match thành công.
- Nhánh LiveKit giữ nguyên, tự bật khi có key.

## 3. Hệ Quả
- **Tích cực**: một gateway thay 3 nơi; không thêm tính năng; frontend đổi tối thiểu.
- **Đánh đổi**: Socket.IO không đi qua rewrite Vercel → kết nối thẳng `*.onrender.com` (CORS + token). Một instance nên chưa cần Redis adapter.

## 4. Các Phương Án Đã Loại Bỏ
1. **LiveKit 100%, bỏ mesh** (HLD cũ): thay đổi hành vi khi chưa có key → Phase 2.
2. **Gateway riêng cho từng tính năng**: lặp code relay ba lần.
3. **Chấm PvP ở server ngay**: tính năng mới → Phase 2.
