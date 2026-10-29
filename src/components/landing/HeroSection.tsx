import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import heroImg from "@/assets/hero-student.webp";
import { useQuery } from "@tanstack/react-query";
import { getAssessmentStatsOverview } from "@/lib/api/assessment";
import { countCourses } from "@/lib/api/catalog";
import { CheckCircle2, FileCheck2, Headphones, ChevronRight, ArrowRight, BookOpen, Sparkles } from "lucide-react";

const HeroSection = () => {
  const { user } = useAuth();

  // Lấy số liệu thật từ backend API
  const { data: liveStats } = useQuery({
    queryKey: ["hero-live-stats"],
    queryFn: async () => {
      const [statsRes, coursesRes] = await Promise.all([
        getAssessmentStatsOverview(),
        countCourses({ active: true }),
      ]);
      return {
        users: statsRes.data?.total_users || 0,
        courses: coursesRes.count || 0,
      };
    },
    staleTime: 1000 * 60 * 10,
  });

  const formatCount = (n?: number) => {
    if (!n || n <= 0) return "0";
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k+`;
    return `${n}`;
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/30 via-white to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950 border-b border-border">
      <div className="container mx-auto px-4 py-8 md:py-12 relative">
        <div className="grid md:grid-cols-12 gap-8 items-center">
          {/* Left: Content (7 cols) */}
          <div className="md:col-span-7 space-y-4 animate-fade-in">
            {/* Tag badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-primary">
                Nền tảng tự luyện TOEIC thực chiến
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight text-foreground tracking-tight">
              Luyện nghe chép chính tả &amp; Luyện đề TOEIC{" "}
              <span className="text-primary">có lời giải chi tiết</span>
            </h1>

            {/* Sub-headline */}
            <p className="text-muted-foreground leading-relaxed font-medium text-xs sm:text-sm max-w-lg">
              Rèn phản xạ nghe bắt âm qua Dictation, học từ vựng Flashcard theo chủ đề và thi thử Full Test 7 Part với transcript và đáp án chi tiết.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 pt-0.5">
              <div className="flex items-center gap-1.5 bg-card border border-border/80 rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Format đề ETS mới nhất</span>
              </div>
              <div className="flex items-center gap-1.5 bg-card border border-border/80 rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
                <Headphones className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Dictation Part 1–4</span>
              </div>
              <div className="flex items-center gap-1.5 bg-card border border-border/80 rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
                <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Giải thích từng câu</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="pt-1 space-y-2.5 w-full max-w-md">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Button 1: Luyện đề Full Test */}
                <a
                  href="#section-fulltest"
                  className="btn-3d btn-3d-primary p-3 rounded-xl flex items-center justify-between gap-2.5 group text-left shadow-sm hover:shadow"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <FileCheck2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-white block leading-tight">
                        Luyện Đề Full Test
                      </span>
                      <span className="text-xs text-white/80 font-medium block mt-0.5">
                        Thi thử 200 câu
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-white/80 group-hover:translate-x-1 transition-transform shrink-0" />
                </a>

                {/* Button 2: Luyện nghe điền từ */}
                <a
                  href="#section-listening"
                  className="btn-3d btn-3d-green p-3 rounded-xl flex items-center justify-between gap-2.5 group text-left shadow-sm hover:shadow"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <Headphones className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-white block leading-tight">
                        Nghe Chép Chính Tả
                      </span>
                      <span className="text-xs text-white/80 font-medium block mt-0.5">
                        Tua câu &amp; chấm tự động
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-white/80 group-hover:translate-x-1 transition-transform shrink-0" />
                </a>
              </div>

              {/* Secondary links */}
              <div className="flex items-center gap-3 text-xs font-semibold">
                {user ? (
                  <Link
                    to="/profile"
                    className="text-foreground hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <span>Vào Hồ sơ học tập</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : (
                  <a
                    href="#section-video"
                    className="text-foreground hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <span>Xem tất cả khóa học</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                )}
                {!user && (
                  <>
                    <span className="text-muted-foreground/30">•</span>
                    <Link
                      to="/register"
                      className="text-muted-foreground hover:text-primary transition-colors font-medium text-xs"
                    >
                      Đăng ký học thử miễn phí
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Real Stats counter */}
            <div className="flex items-center gap-5 pt-3 border-t border-border/70 text-xs">
              <div>
                <p className="text-base font-bold text-foreground leading-tight">
                  {formatCount(liveStats?.users)}
                </p>
                <p className="text-xs text-muted-foreground font-medium">Học viên đang học</p>
              </div>
              <div className="w-px h-6 bg-border" />
              <div>
                <p className="text-base font-bold text-foreground leading-tight">
                  {formatCount(liveStats?.courses)}
                </p>
                <p className="text-xs text-muted-foreground font-medium">Khóa học &amp; đề thi</p>
              </div>
              <div className="w-px h-6 bg-border" />
              <div>
                <p className="text-base font-bold text-foreground leading-tight">24/7</p>
                <p className="text-xs text-muted-foreground font-medium">Tự luyện chủ động</p>
              </div>
            </div>
          </div>

          {/* Right: Graphic (5 cols) */}
          <div className="md:col-span-5 flex justify-center items-center relative">
            <div className="relative">
              {/* Floating feature badge */}
              <div className="absolute -top-2 -right-2 sm:-right-4 bg-card border border-border rounded-lg px-2.5 py-1.5 shadow-md z-10">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5 text-blue-600" />
                  <span>Dictation Part 1–4</span>
                </p>
              </div>

              <div className="absolute -bottom-2 -left-2 sm:-left-4 bg-card border border-border rounded-lg px-2.5 py-1.5 shadow-md z-10">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Thi thử Full Test 7 Part</span>
                </p>
              </div>

              <img
                src={heroImg}
                alt="Học viên luyện tiếng Anh"
                className="w-full max-w-[220px] sm:max-w-[280px] object-contain relative z-0 drop-shadow-md"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
