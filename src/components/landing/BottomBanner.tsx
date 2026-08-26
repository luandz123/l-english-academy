import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";

// Placeholder links — thay link thật vào đây
const SOCIAL_LINKS = {
  tiktok: "https://www.tiktok.com/@YOUR_TIKTOK",
  youtube: "https://www.youtube.com/@YOUR_YOUTUBE",
  facebook: "https://www.facebook.com/luan25032000",
};

const BottomBanner = () => {
  return (
    <section className="bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-zinc-950 dark:to-zinc-900 py-16 text-white text-center relative overflow-hidden border-t-4 border-[var(--duo-correct-dark)]">
      <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-100px] w-[400px] h-[400px] rounded-full bg-white/10 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 max-w-4xl relative z-10 space-y-6">
        <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-md rounded-2xl border-2 border-white/20 mb-2">
          <Trophy size={40} className="text-yellow-300 animate-bounce" />
        </div>

        <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
          Học Tiếng Anh Vui Hơn <br />
          <span className="text-yellow-300 underline decoration-wavy decoration-yellow-400">
            Cùng L-English Academy!
          </span>
        </h2>

        <p className="text-emerald-50 dark:text-zinc-300 font-medium text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Hệ thống luyện tập toàn diện: Nghe chép chính tả, Flashcard từ vựng, Đề thi thử và Video bài giảng — tất cả trong một nền tảng.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to="/register"
            className="btn-3d text-foreground bg-yellow-300 hover:bg-yellow-200 border-b-4 border-yellow-500 hover:border-yellow-400 font-black px-8 py-4 rounded-2xl text-base inline-flex items-center gap-2 transform active:translate-y-1 shadow-lg"
            style={{ color: "#111" }}
          >
            Bắt đầu học MIỄN PHÍ ngay 🚀
          </Link>
          <Link
            to="/courses"
            className="btn-3d bg-white/10 hover:bg-white/20 border-2 border-white/20 text-white font-extrabold px-8 py-4 rounded-2xl text-base inline-block"
          >
            Xem danh sách khóa học
          </Link>
        </div>

        {/* Social Media Links */}
        <div className="flex items-center justify-center gap-5 pt-6">
          <p className="text-sm text-emerald-100 dark:text-zinc-400 font-bold">Theo dõi chúng mình:</p>

          {/* TikTok */}
          <a
            href={SOCIAL_LINKS.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/25 border border-white/20 flex items-center justify-center transition-all hover:scale-110"
          >
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.74a4.85 4.85 0 01-1-.05z"/>
            </svg>
          </a>

          {/* YouTube */}
          <a
            href={SOCIAL_LINKS.youtube}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-red-500/80 border border-white/20 flex items-center justify-center transition-all hover:scale-110"
          >
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>

          {/* Facebook */}
          <a
            href={SOCIAL_LINKS.facebook}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-blue-600/80 border border-white/20 flex items-center justify-center transition-all hover:scale-110"
          >
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
};

export default BottomBanner;
