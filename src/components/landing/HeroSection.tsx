import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import heroImg from "@/assets/hero-student.png";

const HeroSection = () => {
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#fff9fb_0%,#fff7f2_100%)] dark:bg-zinc-950">
      <div className="absolute top-10 left-10 w-48 h-48 rounded-full bg-[var(--duo-green)]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-5 right-10 w-56 h-56 rounded-full bg-[var(--duo-orange)]/10 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 py-8 md:py-10 relative">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          {/* Text side */}
          <div className="space-y-4 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-[var(--primary-light)] border-2 border-[var(--duo-green)]/15 rounded-full px-3 py-1">
              <span className="text-xs font-bold text-[var(--duo-green-dark)]">
                💰 Học tiếng Anh tiết kiệm &amp; hiệu quả
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-foreground">
              Tiết Kiệm Chi Phí &mdash; <span className="text-[var(--duo-green)]">Tối Đa Hiệu Quả</span><br />
              <span className="text-gradient text-2xl md:text-3xl font-bold">
                Học mọi lúc, mọi nơi, tự học chủ động
              </span>
            </h1>

            <p className="text-muted-foreground leading-relaxed font-medium text-sm md:text-base max-w-md">
              Dictation nghe chép, Flashcard từ vựng, Đề thi thử Full Test TOEIC — 
              chi phí tối ưu, không cần trung tâm đắt đỏ.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link to={user ? "/courses" : "/login"} className="btn-3d btn-3d-green text-sm px-6 py-2.5 inline-block">
                Bắt đầu học ngay 🚀
              </Link>
              <Link to="/courses" className="btn-3d btn-3d-white text-sm px-6 py-2.5 inline-block">
                Xem khóa học
              </Link>
            </div>

            {/* Social links */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a href="https://www.tiktok.com/@YOUR_TIKTOK" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-[var(--duo-green)] transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.74a4.85 4.85 0 01-1-.05z"/>
                </svg>
                TikTok
              </a>
              <span className="text-muted-foreground/40">•</span>
              <a href="https://www.youtube.com/@YOUR_YOUTUBE" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-[var(--duo-orange)] transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                YouTube
              </a>
              <span className="text-muted-foreground/40">•</span>
              <a href="https://www.facebook.com/YOUR_FACEBOOK" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-[var(--duo-blue)] transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </a>
            </div>
          </div>

          {/* Image side */}
          <div className="flex justify-center items-end animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <img
              src={heroImg}
              alt="Học viên đang học trực tuyến"
              className="w-full max-w-[300px] md:max-w-[360px] object-contain drop-shadow-xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
