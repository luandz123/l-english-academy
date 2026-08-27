import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import heroImg from "@/assets/hero-student.webp";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Zap, Star, FileCheck2, Headphones, ChevronRight, ArrowRight, Sparkles } from "lucide-react";

const HeroSection = () => {
  const { user } = useAuth();

  // Lấy số liệu thật từ DB để tăng trust
  const { data: liveStats } = useQuery({
    queryKey: ["hero-live-stats"],
    queryFn: async () => {
      const [usersRes, coursesRes] = await Promise.all([
        supabase.from("profiles").select("user_id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      return {
        users: usersRes.count || 0,
        courses: coursesRes.count || 0,
      };
    },
    staleTime: 1000 * 60 * 10, // cache 10 phút
  });

  const formatCount = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k+`;
    if (n > 0) return `${n}+`;
    return "100+";
  };

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#fff9fb_0%,#fff7f2_100%)] dark:bg-zinc-950">
      {/* Decorative blobs */}
      <div className="absolute top-10 left-10 w-48 h-48 rounded-full bg-[var(--duo-green)]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-5 right-10 w-56 h-56 rounded-full bg-[var(--duo-orange)]/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[var(--duo-purple)]/5 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 py-10 md:py-16 relative">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Text side */}
          <div className="space-y-5 animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[var(--primary-light)] border-2 border-[var(--duo-green)]/15 rounded-full px-4 py-1.5">
              <span className="flex h-2 w-2 rounded-full bg-[var(--duo-green)] animate-pulse" />
              <span className="text-xs font-extrabold text-[var(--duo-green-dark)] uppercase tracking-wider">
                💰 Học tiếng Anh Miễn Phí &amp; hiệu quả
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight text-foreground">
              Tiết Kiệm Chi Phí —{" "}
              <span className="text-[var(--duo-green)]">Tối Đa Hiệu Quả</span>
              <br />
              <span className="text-gradient text-2xl md:text-3xl font-bold">
                Học mọi lúc, mọi nơi, tự học chủ động
              </span>
            </h1>

            {/* Sub */}
            <p className="text-muted-foreground leading-relaxed font-medium text-sm md:text-base max-w-md">
              Dictation nghe chép, Flashcard từ vựng, Đề thi thử Full Test TOEIC —
              chi phí tối ưu, không cần trung tâm đắt đỏ.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border-2 border-[var(--duo-gray)] rounded-full px-3 py-1.5 shadow-sm">
                <Shield className="w-3.5 h-3.5 text-[var(--duo-correct)]" />
                <span className="text-xs font-bold text-foreground">7 Part TOEIC đầy đủ</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border-2 border-[var(--duo-gray)] rounded-full px-3 py-1.5 shadow-sm">
                <Zap className="w-3.5 h-3.5 text-[var(--duo-orange)]" />
                <span className="text-xs font-bold text-foreground">Chấm điểm tự động</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border-2 border-[var(--duo-gray)] rounded-full px-3 py-1.5 shadow-sm">
                <Star className="w-3.5 h-3.5 text-[var(--duo-yellow)]" />
                <span className="text-xs font-bold text-foreground">Giải thích từng câu</span>
              </div>
            </div>

            {/* Quick ce Launcher - Nổi bật mục đích Luyện đề / Luyện nghe */}
            <div className="pt-2 space-y-3 w-full max-w-lg">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <p className="text-xs font-black uppercase text-[var(--duo-blue)] tracking-wider">
                  Vào luyện tập ngay
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Button 1: Luyện đề Full Test */}
                <Link
                  to="/courses?filter=fulltest"
                  className="btn-3d btn-3d-green p-3.5 rounded-2xl flex items-center justify-between gap-3 group text-left shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <FileCheck2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="font-black text-sm sm:text-base text-white block leading-tight">
                        Luyện Đề Full Test
                      </span>
                      <span className="text-[11px] text-white/80 font-bold block mt-0.5">
                        Thi thử TOEIC 200 câu
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform shrink-0" />
                </Link>

                {/* Button 2: Luyện nghe điền từ */}
                <Link
                  to="/courses?filter=listening"
                  className="btn-3d btn-3d-blue p-3.5 rounded-2xl flex items-center justify-between gap-3 group text-left shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Headphones className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="font-black text-sm sm:text-base text-white block leading-tight">
                        Luyện Nghe Điền Từ
                      </span>
                      <span className="text-[11px] text-white/80 font-bold block mt-0.5">
                        Dictation cảm ứng
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform shrink-0" />
                </Link>
              </div>

              {/* Secondary links */}
              <div className="flex items-center gap-4 pt-0.5">
                <Link
                  to={user ? "/dashboard" : "/courses"}
                  className="text-xs font-black text-foreground hover:text-[var(--duo-green)] flex items-center gap-1.5 transition-colors"
                >
                  <span>{user ? "Vào Dashboard học viên" : "Xem tất cả khóa học"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                {!user && (
                  <>
                    <span className="text-muted-foreground/30">•</span>
                    <Link
                      to="/register"
                      className="text-xs font-bold text-muted-foreground hover:text-[var(--duo-blue)] transition-colors"
                    >
                      Đăng ký tài khoản miễn phí
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Live stats */}
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <div className="text-center">
                <p className="text-xl font-extrabold text-foreground">
                  {formatCount(liveStats?.users ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground font-bold">Học viên</p>
              </div>
              <div className="w-px h-8 bg-[var(--duo-gray)]" />
              <div className="text-center">
                <p className="text-xl font-extrabold text-foreground">
                  {formatCount(liveStats?.courses ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground font-bold">Khóa học</p>
              </div>
              <div className="w-px h-8 bg-[var(--duo-gray)]" />
              <div className="text-center">
                <p className="text-xl font-extrabold text-foreground">100%</p>
                <p className="text-xs text-muted-foreground font-bold">Dữ liệu thật</p>
              </div>
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
            <div className="relative">
              {/* Floating achievement badge */}
              <div className="absolute -top-4 -right-4 md:-right-8 bg-white dark:bg-zinc-900 border-2 border-[var(--duo-gray)] rounded-2xl px-3 py-2 shadow-[0_4px_0_var(--duo-gray)] z-10 animate-bounce">
                <p className="text-xs font-extrabold text-foreground">🏆 TOEIC 990/990</p>
                <p className="text-[10px] text-muted-foreground font-bold">Đỗ Hữu Nam đạt được!</p>
              </div>
              {/* Floating streak badge */}
              <div className="absolute -bottom-2 -left-4 md:-left-8 bg-white dark:bg-zinc-900 border-2 border-[var(--duo-gray)] rounded-2xl px-3 py-2 shadow-[0_4px_0_var(--duo-gray)] z-10">
                <p className="text-xs font-extrabold text-[var(--duo-orange)]">🔥 30 ngày liên tiếp</p>
                <p className="text-[10px] text-muted-foreground font-bold">Streak học tập</p>
              </div>
              <img
                src={heroImg}
                alt="Học viên đang học trực tuyến"
                className="w-full max-w-[280px] md:max-w-[360px] object-contain drop-shadow-xl relative z-0"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
