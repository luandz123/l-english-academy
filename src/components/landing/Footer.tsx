import Logo from "@/components/Logo";
import { Link } from "react-router-dom";
import { Phone, Mail, Clock, MessageCircle, ArrowRight, ShieldCheck, Heart } from "lucide-react";

const SOCIAL_LINKS = {
  tiktok: "https://www.tiktok.com/@YOUR_TIKTOK",
  youtube: "https://www.youtube.com/@YOUR_YOUTUBE",
  facebook: "https://www.facebook.com/YOUR_FACEBOOK",
  zalo: "https://zalo.me/0334729066",
};

const Footer = () => {
  return (
    <footer className="bg-[#050c18] text-white/80 pt-16 pb-12 border-t border-cyan-500/20" id="contact">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-slate-800/80">
          {/* Cột 1: Thương hiệu (4 Cột trên Desktop) */}
          <div className="lg:col-span-4 space-y-4">
            <Logo showText={true} imgClassName="w-8 h-8 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]" />
            <p className="text-sm font-bold text-cyan-400 flex items-center gap-1.5 font-display">
              <span>Học Tiếng Anh Vui Như Chơi Game!</span>
              <span>🎮</span>
            </p>
            <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm">
              L-English — Hệ thống học và luyện thi TOEIC tốt nhất 2026. Kết hợp đề thi thử chuẩn ETS, phương pháp phản xạ bắt âm 8 bước và đấu trường học từ vựng Arcade.
            </p>

            <div className="pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                Kênh kết nối chính thức:
              </span>
              <div className="flex items-center gap-2.5">
                {/* TikTok */}
                <a
                  href={SOCIAL_LINKS.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center transition-all hover:scale-110 text-white hover:text-emerald-400"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.74a4.85 4.85 0 01-1-.05z" />
                  </svg>
                </a>

                {/* YouTube */}
                <a
                  href={SOCIAL_LINKS.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-red-600/20 border border-slate-800 hover:border-red-500/50 flex items-center justify-center transition-all hover:scale-110 text-white hover:text-red-400"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>

                {/* Facebook */}
                <a
                  href={SOCIAL_LINKS.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-blue-600/20 border border-slate-800 hover:border-blue-500/50 flex items-center justify-center transition-all hover:scale-110 text-white hover:text-blue-400"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>

                {/* Zalo */}
                <a
                  href={SOCIAL_LINKS.zalo}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Zalo"
                  className="px-3 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-500 flex items-center justify-center transition-all hover:scale-105 text-white font-black text-xs shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                >
                  <span>Zalo</span>
                </a>
              </div>
            </div>
          </div>

          {/* Cột 2: Chương trình luyện thi (3 Cột) */}
          <div className="lg:col-span-3 space-y-3.5">
            <h4 className="font-black text-sm uppercase tracking-wider text-white font-display">
              Chương Trình Luyện Thi
            </h4>
            <div className="flex flex-col gap-2.5 text-xs text-slate-400 font-medium">
              <a href="#section-fulltest" className="hover:text-cyan-400 transition-colors">
                Phòng Thi Thử Full Test ETS 2026
              </a>
              <a href="#section-listening" className="hover:text-cyan-400 transition-colors">
                Luyện Nghe Từng Bước (Dictation)
              </a>
              <Link to="/part2-coach" className="hover:text-cyan-400 transition-colors">
                Phản Xạ Part 2 (Quy Trình 8 Bước)
              </Link>
              <a href="#section-video" className="hover:text-cyan-400 transition-colors">
                Khóa Học Video Nghe - Đọc 700+
              </a>
              <a href="#section-games" className="hover:text-cyan-400 transition-colors">
                Khu Trò Chơi Học Từ Vựng (Arcade)
              </a>
            </div>
          </div>

          {/* Cột 3: Dành cho học viên (2 Cột) */}
          <div className="lg:col-span-2 space-y-3.5">
            <h4 className="font-black text-sm uppercase tracking-wider text-white">
              Dành Cho Học Viên
            </h4>
            <div className="flex flex-col gap-2.5 text-xs text-slate-400 font-medium">
              <Link to="/profile" className="hover:text-emerald-400 transition-colors">
                Bảng Xếp Hạng Tuần
              </Link>
              <a href="/#section-video" className="hover:text-emerald-400 transition-colors">
                Cẩm Nang Học Từ Mất Gốc
              </a>
              <a href={SOCIAL_LINKS.zalo} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
                Cộng Đồng Học Viên
              </a>
              <a href="/#combos" className="hover:text-emerald-400 transition-colors">
                Hướng Dẫn Kích Hoạt VIP
              </a>
              <a href="#" className="hover:text-emerald-400 transition-colors">
                Điều Khoản Sử Dụng
              </a>
            </div>
          </div>

          {/* Cột 4: Hỗ trợ trực tiếp 24/7 (3 Cột) */}
          <div className="lg:col-span-3 space-y-3.5">
            <h4 className="font-black text-sm uppercase tracking-wider text-white">
              Hỗ Trợ Trực Tiếp 24/7
            </h4>
            <div className="space-y-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-medium block">
                  Hotline Cố Vấn Học Tập:
                </span>
                <a
                  href="tel:0334729066"
                  className="text-xs font-black text-white hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>0334 729 066 (Thầy Luận)</span>
                </a>
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium block">
                  Email Hỗ Trợ:
                </span>
                <a
                  href="mailto:hotro@l-english.vn"
                  className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>hotro@l-english.vn</span>
                </a>
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium block">
                  Giờ Làm Việc:
                </span>
                <p className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>08:00 – 23:00 (Cả Thứ 7 &amp; CN)</span>
                </p>
              </div>

              <div className="pt-1">
                <a
                  href={SOCIAL_LINKS.zalo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs inline-flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Nhắn Tin Tư Vấn Nhanh Qua Zalo</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Dòng bản quyền & Hệ thống */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <div>
            © 2026 L-English Academy. Đã đăng ký bản quyền thương hiệu.
          </div>
          <div className="flex items-center gap-2">
            <span>Đồng hành cùng học viên Việt Nam chinh phục TOEIC</span>
            <span className="text-emerald-500 font-black">💚</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
