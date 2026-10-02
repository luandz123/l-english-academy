import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Layers,
  GraduationCap,
  Flame,
  Sparkles,
  Zap,
  ShoppingBag,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Video,
  Headphones,
  FileCheck2,
  Clock,
  Award,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { CourseCard, CourseRow } from "@/components/CourseCard";
import { trackEvent } from "@/lib/analytics";
import iconFulltest from "@/assets/icons/icon-fulltest.webp";
import iconDictation from "@/assets/icons/icon-dictation.webp";
import iconReflex from "@/assets/icons/icon-reflex.webp";
import iconArcade from "@/assets/icons/icon-arcade.webp";
import iconVideo from "@/assets/icons/icon-video.webp";
import iconFlame from "@/assets/icons/icon-flame.webp";
import iconGift from "@/assets/icons/icon-gift.webp";
import iconShield from "@/assets/icons/icon-shield.webp";
import iconGradcap from "@/assets/icons/icon-gradcap.webp";

export const CourseShowcase = () => {
  const [modalOpen, setModalOpen] = useState(false);

  // Lấy toàn bộ khóa học ĐANG HOẠT ĐỘNG (is_active = true) từ database
  const { data: activeCourses = [], isLoading } = useQuery<CourseRow[]>({
    queryKey: ["homepage-active-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("id", { ascending: false });
      if (error) {
        console.error("Error fetching courses:", error);
        return [];
      }
      return data || [];
    },
  });

  // Phân chia khóa học theo từng chuyên đề theo phong cách Ngoại Ngữ 24h:
  // 1. Nhóm Đề Thi Thử Full Test 200 Câu
  const fullTestCourses = useMemo(() => {
    return activeCourses.filter((c) => c.course_type === "fulltest");
  }, [activeCourses]);

  // 2. Nhóm Khóa Học Video & Nghe - Đọc
  const videoCourses = useMemo(() => {
    return activeCourses.filter((c) => c.course_type === "video_quiz");
  }, [activeCourses]);

  // 3. Nhóm Luyện Nghe Điền Từ (Dictation)
  const listeningCourses = useMemo(() => {
    return activeCourses.filter((c) => c.course_type === "listening");
  }, [activeCourses]);

  return (
    <div className="space-y-10" id="combos">
      {/* ========================================================================= */}
      {/* SECTION 1: PHÒNG THI THỬ FULL TEST TOEIC CHUẨN ETS (Phong cách Ngoại Ngữ 24h) */}
      {/* ========================================================================= */}
      <section
        id="section-fulltest"
        className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-7 md:p-8 shadow-sm space-y-6 scroll-mt-20 sm:scroll-mt-24"
      >
        {/* Header Kệ Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 p-1 flex items-center justify-center border border-emerald-500/20 shadow-xs shrink-0 mt-0.5 sm:mt-0">
              <img src={iconFulltest} alt="" className="w-full h-full object-contain drop-shadow-xs" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-xl md:text-2xl font-black text-foreground tracking-normal flex flex-wrap items-center">
                  <span>PHÒNG THI THỬ</span>
                  <span className="ml-1.5 mr-2">TOEIC FULL TEST</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">
                    (FORMAT ETS)
                  </span>
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 shrink-0">
                  {fullTestCourses.length} bộ đề
                </span>
              </div>
              <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">
                Bộ đề bấm giờ thật 120 phút, 200 câu Listening &amp; Reading, chấm điểm tự động kèm phân tích đáp án chi tiết.
              </p>
            </div>
          </div>
        </div>

        {/* Lưới khóa học Full Test: Cân đối 3 cột trên desktop, không để lệch khoảng trống */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : fullTestCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {fullTestCourses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}

            {/* Ô/Card thứ 3: Khám phá toàn bộ kho đề thi thử ETS giúp grid 3 cột cân đối 100% */}
            {fullTestCourses.length <= 2 && (
              <Link
                to="/fulltests"
                onClick={() =>
                  trackEvent("click_fulltest_explore_all", {
                    source: "showcase_3rd_card",
                  })
                }
                className="group rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 bg-slate-50/60 dark:bg-zinc-800/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 p-5 sm:p-6 flex flex-col md:flex-row lg:flex-col justify-between items-start md:items-center lg:items-stretch gap-4 transition-all duration-200 cursor-pointer min-h-[160px] lg:min-h-[320px] md:col-span-2 lg:col-span-1"
              >
                <div className="space-y-3.5 max-w-xl">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs">
                    <FileCheck2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Kho Đề Thi Mở Rộng
                    </span>
                    <h3 className="text-base font-extrabold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Xem Tất Cả Bộ Đề Thi Thử ETS
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
                      Tùy chọn thi thử toàn bộ 7 Parts (200 câu) có tính giờ 120 phút hoặc luyện riêng từng Part theo trình độ.
                    </p>
                  </div>
                </div>

                <div className="w-full md:w-auto lg:w-full pt-4 md:pt-0 lg:pt-4 border-t md:border-t-0 lg:border-t border-slate-200/70 dark:border-zinc-800 flex items-center justify-between md:gap-4 shrink-0">
                  <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    Format ETS mới nhất
                  </span>
                  <span className="py-2 px-3.5 rounded-xl font-bold text-xs bg-emerald-600 group-hover:bg-emerald-700 text-white inline-flex items-center gap-1.5 transition-colors shadow-xs shrink-0">
                    <span>Xem tất cả</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Đang cập nhật bộ đề thi mới...</p>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: KHÓA HỌC BÀI GIẢNG VIDEO & NGỮ PHÁP TRỌNG ĐIỂM (Ngoại Ngữ 24h) */}
      {/* ========================================================================= */}
      <section
        id="section-video"
        className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-7 md:p-8 shadow-sm space-y-6 scroll-mt-20 sm:scroll-mt-24"
      >
        {/* Header Kệ Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 p-1 flex items-center justify-center border border-blue-500/20 shadow-xs shrink-0 mt-0.5 sm:mt-0">
              <img src={iconVideo} alt="" className="w-full h-full object-contain drop-shadow-xs" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-xl md:text-2xl font-black text-foreground">
                  KHÓA HỌC VIDEO &amp; LUYỆN THI TOEIC{" "}
                  <span className="text-blue-600 dark:text-blue-400 font-black">
                    NGHE - ĐỌC
                  </span>
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 shrink-0">
                  {videoCourses.length} khóa học
                </span>
              </div>
              <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">
                Bài giảng video chuẩn mực theo từng Part 1–7, trang bị phương pháp giải đề, mẹo tránh bẫy và bài tập thực hành.
              </p>
            </div>
          </div>
        </div>

        {/* Lưới khóa học Video: Cân đối 3 cột trên desktop, không để lệch khoảng trống */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : videoCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {videoCourses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}

            {/* Card Bổ Trợ 2: Chuyên Đề Ngữ Pháp & Mẹo Tránh Bẫy Part 5-6 */}
            {videoCourses.length <= 2 && (
              <div className="group bg-card rounded-2xl border border-border/70 hover:border-blue-500/50 shadow-soft-sm hover:shadow-soft-md transition-all duration-200 flex flex-col h-full overflow-hidden">
                <div className="aspect-video w-full relative overflow-hidden bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-sky-500/20 flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 mb-2">
                    <img src={iconVideo} alt="" className="w-8 h-8 object-contain" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Lộ Trình Cốt Lõi Part 5–6
                  </span>
                  <span className="text-sm font-extrabold text-foreground mt-0.5 line-clamp-1">
                    70 Quy Tắc Ngữ Pháp &amp; Mẹo Bẫy ETS
                  </span>
                  <div className="absolute top-2.5 right-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs">
                      TẶNG KÈM VIP
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <span>Video bài giảng</span>
                      <span>•</span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">Tự học 30 ngày</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                      Chiến Thuật Xử Lý Nhanh Câu Ngữ Pháp &amp; Từ Loại
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-normal line-clamp-2 leading-relaxed">
                      Phân loại 12 dạng câu hỏi cốt lõi, công thức 5 giây chọn đáp án đúng không cần dịch toàn câu, tối ưu thời gian làm bài.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <div className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                      <span>70+ bài học trọng tâm</span>
                    </div>
                    <span className="font-bold text-foreground/80">Thầy Luận Mentor</span>
                  </div>

                  <div className="pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs text-slate-400 line-through block">500.000 đ</span>
                      <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                        Có trong Gói VIP
                      </span>
                    </div>
                    <Link
                      to="/#combos"
                      className="py-1.5 px-3.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-soft-sm transition-all group-hover:translate-x-0.5 shrink-0"
                    >
                      <span>Xem lộ trình</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Card Khám Phá 3: Toàn Bộ Thư Viện Bài Giảng Video */}
            {videoCourses.length <= 2 && (
              <Link
                to="/#combos"
                className="group rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 bg-slate-50/60 dark:bg-zinc-800/40 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 p-5 sm:p-6 flex flex-col justify-between items-stretch gap-4 transition-all duration-200 cursor-pointer min-h-[280px]"
              >
                <div className="space-y-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Kho Khóa Học Mở Rộng
                    </span>
                    <h3 className="text-base font-extrabold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Xem Toàn Bộ Video Bài Giảng TOEIC
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
                      Hệ thống bài giảng từ nền tảng 450 đến bứt phá 850+, chia theo từng chuyên đề Part 1–7 kèm tài liệu PDF và bài tập áp dụng.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/70 dark:border-zinc-800 flex items-center justify-between shrink-0">
                  <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    Cập nhật liên tục
                  </span>
                  <span className="py-2 px-3.5 rounded-xl font-bold text-xs bg-blue-600 group-hover:bg-blue-700 text-white inline-flex items-center gap-1.5 transition-colors shadow-xs shrink-0">
                    <span>Xem lộ trình</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Đang cập nhật khóa học video...</p>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: LUYỆN NGHE CHÉP CHÍNH TẢ (DICTATION CẢM ỨNG ĐỘC QUYỀN)           */}
      {/* ========================================================================= */}
      <section
        id="section-listening"
        className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-7 md:p-8 shadow-sm space-y-6 scroll-mt-20 sm:scroll-mt-24"
      >
        {/* Header Kệ Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/60 p-1 flex items-center justify-center border border-purple-500/20 shadow-xs shrink-0 mt-0.5 sm:mt-0">
              <img src={iconDictation} alt="" className="w-full h-full object-contain drop-shadow-xs" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-xl md:text-2xl font-black text-foreground">
                  LUYỆN NGHE ĐIỀN TỪ{" "}
                  <span className="text-purple-600 dark:text-purple-400 font-black">
                    (DICTATION CHÉP CHÍNH TẢ)
                  </span>
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 shrink-0">
                  {listeningCourses.length} chương trình
                </span>
              </div>
              <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">
                Phương pháp nghe chép chính tả Part 1–4, cơ chế kéo thả từ khóa cảm ứng thông minh, nhận diện nuốt âm và nối từ.
              </p>
            </div>
          </div>
        </div>

        {/* Banner Khám Phá Chế Độ Luyện Nghe Phản Xạ 8 Bước Part 2 */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-800 via-indigo-800 to-blue-800 rounded-3xl p-6 sm:p-7 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-lg border border-purple-500/30">
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black uppercase tracking-wider backdrop-blur-xs border border-white/20">
              <img src={iconReflex} alt="" className="w-4 h-4 object-contain inline-block" />
              <span>Phương pháp phản xạ mới</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Luyện Nghe Phản Xạ TOEIC Part 2 (Quy Trình 8 Bước Độc Quyền)
            </h3>
            <p className="text-xs sm:text-sm text-white/85 font-medium max-w-2xl leading-relaxed">
              Bẻ nhỏ Functional Chunks • Phản xạ 1s bật nghĩa • Đoán hướng trả lời • Shadowing nối âm nuốt âm • Vạch trần bẫy ETS • Nghe thực chiến như thi • Nghe thụ động liên tục.
            </p>
          </div>
          <Link
            to="/part2-coach"
            onClick={() => trackEvent("click_part2_coach", { source: "showcase_banner" })}
            className="btn-3d btn-3d-yellow py-3 px-6 text-xs sm:text-sm font-black whitespace-nowrap flex items-center gap-2 shadow-xl shrink-0 relative z-10 cursor-pointer"
          >
            <span>Trải Nghiệm 8 Bước Ngay</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Lưới khóa học Listening: Cân đối 3 cột trên desktop */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : listeningCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {listeningCourses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}

            {/* Card Bổ Trợ 2: Phòng Luyện Bắt Âm & Nối Từ (Micro-listening) */}
            {listeningCourses.length <= 2 && (
              <div className="group bg-card rounded-2xl border border-border/70 hover:border-purple-500/50 shadow-soft-sm hover:shadow-soft-md transition-all duration-200 flex flex-col h-full overflow-hidden">
                <div className="aspect-video w-full relative overflow-hidden bg-gradient-to-tr from-purple-600/20 via-indigo-600/15 to-pink-500/20 flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 mb-2">
                    <img src={iconDictation} alt="" className="w-8 h-8 object-contain" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Kỹ Năng Bắt Âm
                  </span>
                  <span className="text-sm font-extrabold text-foreground mt-0.5 line-clamp-1">
                    Bắt Nuốt Âm &amp; Nối Từ Thực Chiến
                  </span>
                  <div className="absolute top-2.5 right-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white shadow-xs">
                      ĐỘC QUYỀN
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <span>Luyện nghe cảm ứng</span>
                      <span>•</span>
                      <span className="text-purple-600 dark:text-purple-400 font-semibold">Tua chậm 0.75x</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2 leading-snug">
                      Khắc Phục Tình Trạng "Nhìn Hiểu – Nghe Điếc"
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-normal line-clamp-2 leading-relaxed">
                      Bẻ nhỏ câu thoại theo cụm nghĩa (chunks), luyện gõ từ khóa nghe được và đối chiếu đáp án tức thì với transcript chuẩn.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <div className="flex items-center gap-1">
                      <Headphones className="w-3.5 h-3.5 text-purple-600" />
                      <span>500+ đoạn nghe Part 1–4</span>
                    </div>
                    <span className="font-bold text-foreground/80">Thầy Luận Mentor</span>
                  </div>

                  <div className="pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-black text-purple-600 dark:text-purple-400">
                        Miễn phí
                      </span>
                    </div>
                    <Link
                      to="/part2-coach"
                      className="py-1.5 px-3.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-soft-sm transition-all group-hover:translate-x-0.5 shrink-0"
                    >
                      <span>Luyện tai ngay</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Card Khám Phá 3: Toàn Bộ Thư Viện Dictation */}
            {listeningCourses.length <= 2 && (
              <Link
                to="/part2-coach"
                className="group rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-purple-500/60 dark:hover:border-purple-500/60 bg-slate-50/60 dark:bg-zinc-800/40 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 p-5 sm:p-6 flex flex-col justify-between items-stretch gap-4 transition-all duration-200 cursor-pointer min-h-[280px]"
              >
                <div className="space-y-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      Kho Bài Nghe Mở Rộng
                    </span>
                    <h3 className="text-base font-extrabold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      Xem Tất Cả Bài Dictation &amp; Phản Xạ
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
                      Tuyển tập hơn 100 bài nghe chép chính tả Part 1, 2, 3, 4 phân cấp theo trình độ từ cơ bản đến nâng cao, rèn phản xạ tai nghe nhạy bén.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/70 dark:border-zinc-800 flex items-center justify-between shrink-0">
                  <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    Phương pháp độc quyền
                  </span>
                  <span className="py-2 px-3.5 rounded-xl font-bold text-xs bg-purple-600 group-hover:bg-purple-700 text-white inline-flex items-center gap-1.5 transition-colors shadow-xs shrink-0">
                    <span>Vào luyện nghe</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Đang cập nhật bài luyện nghe...</p>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: GÓI COMBO VIP TOÀN DIỆN TOEIC - ĐẬM CHẤT GAMIFICATION BENTO     */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400/90 dark:border-amber-500/70 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 md:p-10 shadow-[0_12px_45px_rgba(245,158,11,0.2)]">
        {/* Glow ambient effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Cột Trái: Quyền Lợi VIP (7 Cột) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black uppercase tracking-wider backdrop-blur-xs">
                <img src={iconFlame} alt="" className="w-4 h-4 object-contain inline-block" />
                <span>GÓI VIP TOÀN DIỆN TOEIC · ƯU ĐÃI ĐỢT 1 TIẾT KIỆM 50%</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                Đăng Ký Combo Trọn Gói Khóa Học &amp; Kho Đề Thi ETS
              </h2>
              <p className="text-white/80 text-xs sm:text-sm font-normal leading-relaxed max-w-2xl">
                Mở khóa toàn bộ 200+ bộ đề thi thử format ETS có lời giải chi tiết từng câu, trọn bộ video bài giảng Part 1–7 và hệ thống luyện nghe cảm ứng không giới hạn thời gian.
              </p>
            </div>

            {/* 4 Vũ Khí Luyện Thi VIP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">Kho Đề Full Test ETS 200 Câu</h4>
                  <p className="text-[11px] text-white/70">Format 2026 chuẩn 120 phút, giải thích đáp án 100%.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-400/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-purple-400/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">Luyện Nghe Dictation Không Giới Hạn</h4>
                  <p className="text-[11px] text-white/70">Quy trình 8 bước độc quyền bẻ nhỏ âm thanh Part 2.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-400/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-blue-400/20 text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">Trọn Bộ Video Bài Giảng Part 1–7</h4>
                  <p className="text-[11px] text-white/70">Trang bị chiến thuật tránh bẫy tinh vi của đề thi thật.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-400/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">Tự Động Cập Nhật Đề Mới Trọn Đời</h4>
                  <p className="text-[11px] text-white/70">Miễn phí 100% khi ETS ra mắt các bộ đề 2026, 2027.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cột Phải: Thẻ Vé VIP Ticket Giá Sốc (5 Cột) */}
          <div className="lg:col-span-5">
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-md rounded-2xl border-2 border-amber-400/50 p-6 flex flex-col items-center text-center space-y-4 shadow-2xl relative">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-black uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-red-400" />
                <span>TIẾT KIỆM 1.750.000 Đ</span>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-white/60 line-through font-bold">
                  Giá gốc: 3.500.000 đ
                </span>
                <div className="text-3xl sm:text-4xl font-black text-amber-300 tracking-tight">
                  1.750.000 đ
                </div>
                <p className="text-xs text-white/80 font-medium">
                  Thanh toán 1 lần duy nhất để học trọn đời
                </p>
              </div>

              <button
                onClick={() => {
                  trackEvent("click_combo", { location: "showcase_vip_card" });
                  setModalOpen(true);
                }}
                className="btn-3d btn-3d-yellow w-full py-4 text-sm sm:text-base font-black flex items-center justify-center gap-2 shadow-xl hover:brightness-105 active:translate-y-1 cursor-pointer"
              >
                <img src={iconFlame} alt="" className="w-5 h-5 object-contain inline-block" />
                <span>MUA GÓI VIP TRỌN GÓI</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-[11px] text-white/70 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Kích hoạt tài khoản tự động ngay sau khi chuyển khoản</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 CAM KẾT HỌC VIÊN (GAMIFICATION VALUE PROPS BAR)                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 p-1 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <img src={iconFulltest} alt="" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <h4 className="text-xs font-black text-foreground">Bộ Đề Chuẩn ETS</h4>
            <p className="text-[11px] text-muted-foreground font-medium">Format 2026 sát đề thi thật</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 p-1 flex items-center justify-center border border-amber-500/20 shrink-0">
            <img src={iconArcade} alt="" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <h4 className="text-xs font-black text-foreground">Gamification Thú Vị</h4>
            <p className="text-[11px] text-muted-foreground font-medium">Luyện thi vui, phần quà hấp dẫn</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 p-1 flex items-center justify-center border border-purple-500/20 shrink-0">
            <img src={iconDictation} alt="" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <h4 className="text-xs font-black text-foreground">Dictation Đột Phá</h4>
            <p className="text-[11px] text-muted-foreground font-medium">Bứt phá điểm số Listening</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 p-1 flex items-center justify-center border border-blue-500/20 shrink-0">
            <img src={iconShield} alt="" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <h4 className="text-xs font-black text-foreground">Đồng Hành 1-1</h4>
            <p className="text-[11px] text-muted-foreground font-medium">Cố vấn giải đáp 24/7 qua Zalo</p>
          </div>
        </div>
      </div>

      {/* MODAL THANH TOÁN VIETQR COMBO KHÓA HỌC */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <DialogHeader className="space-y-2 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 p-2 flex items-center justify-center border border-blue-500/20 shadow-xs">
              <img src={iconGift} alt="" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            <DialogTitle className="text-xl font-black text-foreground">
              Đăng Ký Gói Combo Khóa Học VIP
            </DialogTitle>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Quét mã VietQR chuyển khoản tự động để kích hoạt tài khoản học viên ngay lập tức.
            </p>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-blue-600 dark:text-blue-400">
                  GÓI HỌC TOÀN DIỆN
                </span>
                <h4 className="font-black text-sm text-foreground">
                  Combo TOEIC VIP Toàn Bộ Khóa Học &amp; Đề Thi
                </h4>
                <span className="text-xs text-slate-500">Thời hạn: Vĩnh viễn (Kèm toàn bộ bản cập nhật)</span>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-blue-600 dark:text-blue-400">
                  1.750.000 đ
                </span>
                <span className="text-xs text-slate-400 line-through block">
                  3.500.000 đ
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/40">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                <img
                  src="https://api.vietqr.io/image/970422-0334729066-qj9Rj0t.jpg?accountName=HOANG%20CONG%20LUAN&amount=1750000&addInfo=VIP%20LENGLISH"
                  alt="VietQR Chuyển Khoản"
                  className="w-48 h-48 object-contain"
                />
              </div>
              <div className="text-center mt-3 space-y-1">
                <p className="text-xs font-bold text-foreground">
                  Ngân hàng: <span className="text-blue-600 font-extrabold">MBBank</span>
                </p>
                <p className="text-xs font-bold text-foreground">
                  Số tài khoản: <span className="text-blue-600 font-extrabold">0334729066</span>
                </p>
                <p className="text-xs font-bold text-foreground">
                  Chủ tài khoản: <span className="font-extrabold">HOANG CONG LUAN</span>
                </p>
                <p className="text-xs text-slate-500">
                  Nội dung CK: <strong className="text-blue-600">VIP [SĐT Của Bạn]</strong>
                </p>
              </div>
            </div>

            <div className="pt-2 text-center">
              <a
                href="https://zalo.me/0334729066"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("click_zalo", { source: "combo_payment_modal" })}
                className="btn-3d btn-3d-green w-full py-2.5 text-xs font-black inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Xác nhận chuyển khoản qua Zalo (0334729066)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseShowcase;
