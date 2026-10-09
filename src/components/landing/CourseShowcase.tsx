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
  Gamepad2,
  Castle,
  Rocket,
  Compass,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { CourseCard, CourseRow } from "@/components/CourseCard";
import { trackEvent } from "@/lib/analytics";
import iconFulltest from "@/assets/icons/icon-fulltest-3d.webp";
import iconDictation from "@/assets/icons/icon-dictation-3d.webp";
import iconReflex from "@/assets/icons/icon-reflex.webp";
import iconArcade from "@/assets/icons/icon-arcade-3d.webp";
import iconVideo from "@/assets/icons/icon-video-3d.webp";
import iconFlame from "@/assets/icons/icon-flame-3d.webp";
import iconGift from "@/assets/icons/icon-gift-3d.webp";
import iconShield from "@/assets/icons/icon-shield.webp";
import iconGradcap from "@/assets/icons/icon-gradcap.webp";
import iconWordDefense from "@/assets/icons/icon-word-defense.webp";
import iconWordShooter from "@/assets/icons/icon-word-shooter.webp";
import iconVocabPacks from "@/assets/icons/icon-vocab-packs.webp";
import iconEtsSeal from "@/assets/icons/icon-ets-seal-3d.webp";
import iconVipCrown from "@/assets/icons/icon-vip-crown-3d.webp";

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

  // 1. Nhóm Đề Thi Thử Full Test 200 Câu
  const fullTestCourses = useMemo(() => {
    return activeCourses.filter((c) => c.course_type === "fulltest");
  }, [activeCourses]);

  // 2. Nhóm Luyện Nghe Điền Từ (Dictation) & Từng Bước
  const listeningCourses = useMemo(() => {
    return activeCourses.filter((c) => c.course_type === "listening");
  }, [activeCourses]);

  // 3. Nhóm Khóa Học Video & Nghe - Đọc
  const videoCourses = useMemo(() => {
    return activeCourses.filter((c) => c.course_type === "video_quiz");
  }, [activeCourses]);

  return (
    <div className="space-y-12">
      {/* ========================================================================= */}
      {/* SECTION 1: PHÒNG THI THỬ (FORMAT ETS 2026)                                */}
      {/* ========================================================================= */}
      <section
        id="section-fulltest"
        className="rounded-3xl border border-emerald-500/25 bg-[#081226]/85 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-[0_10px_35px_rgba(0,0,0,0.5)] scroll-mt-24 transition-all"
      >
        {/* Header Kệ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 p-2 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] shrink-0">
              <img src={iconFulltest} alt="" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg sm:text-2xl font-black text-white font-display tracking-wide">
                  PHÒNG THI THỬ <span className="text-emerald-400">(FORMAT ETS 2026)</span>
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {fullTestCourses.length} bộ đề
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm font-medium">
                200 câu • 120 phút • Bấm giờ thật • Chấm điểm tự động kèm lời giải chi tiết.
              </p>
            </div>
          </div>

          <Link
            to="/fulltests"
            onClick={() => trackEvent("click_fulltest_view_all", { source: "header_btn" })}
            className="self-start sm:self-center py-2 px-4 rounded-xl text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          >
            <span>Xem tất cả bộ đề</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Lưới khóa học Full Test: 3 cột trên desktop */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-2xl bg-slate-800/60" />
            ))}
          </div>
        ) : fullTestCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {fullTestCourses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}

            {/* Ô Khám Phá Thêm Bộ Đề Full Test */}
            {fullTestCourses.length <= 2 && (
              <Link
                to="/fulltests"
                onClick={() =>
                  trackEvent("click_fulltest_explore_all", { source: "showcase_3rd_card" })
                }
                className="group rounded-2xl border-2 border-dashed border-slate-800 hover:border-emerald-500/60 bg-slate-900/40 hover:bg-emerald-950/20 p-6 flex flex-col justify-between items-start gap-4 transition-all duration-200 cursor-pointer min-h-[260px]"
              >
                <div className="space-y-3.5 max-w-xl">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-emerald-500/30">
                    <FileCheck2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Kho Đề Thi Mở Rộng
                    </span>
                    <h3 className="text-base font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                      Xem Tất Cả Bộ Đề Thi Thử ETS
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                      Thi thử trọn gói 7 Parts (200 câu) có tính giờ 120 phút hoặc luyện riêng từng Part theo trình độ.
                    </p>
                  </div>
                </div>

                <div className="w-full pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    Format ETS mới nhất
                  </span>
                  <span className="py-2 px-3.5 rounded-xl font-bold text-xs bg-emerald-600 group-hover:bg-emerald-500 text-white inline-flex items-center gap-1.5 transition-colors shadow-xs">
                    <span>Xem tất cả</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Đang cập nhật bộ đề thi mới...</p>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: LUYỆN NGHE TỪNG BƯỚC & DICTATION                                */}
      {/* ========================================================================= */}
      <section
        id="section-listening"
        className="rounded-3xl border border-purple-500/25 bg-[#081226]/85 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-[0_10px_35px_rgba(0,0,0,0.5)] scroll-mt-24 transition-all"
      >
        {/* Header Kệ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 p-2 flex items-center justify-center border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] shrink-0">
              <img src={iconDictation} alt="" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg sm:text-2xl font-black text-white font-display tracking-wide">
                  LUYỆN NGHE TỪNG BƯỚC <span className="text-purple-400">&amp; DICTATION</span>
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  {listeningCourses.length} bài luyện
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm font-medium">
                Quy trình phản xạ 8 bước Part 2 độc quyền &amp; Nghe chép chính tả bẻ nhỏ âm thanh.
              </p>
            </div>
          </div>
        </div>

        {/* Banner Khám Phá Chế Độ Luyện Nghe Phản Xạ 8 Bước Part 2 */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-blue-900/90 rounded-2xl p-6 sm:p-7 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-[0_0_30px_rgba(147,51,234,0.25)] border border-purple-400/40">
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs font-black uppercase tracking-wider backdrop-blur-xs border border-purple-400/30">
              <img src={iconReflex} alt="" className="w-4 h-4 object-contain inline-block" />
              <span>Quy trình 8 bước độc quyền</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white font-display">
              Luyện Nghe Phản Xạ TOEIC Part 2 (Quy Trình 8 Bước Độc Quyền)
            </h3>
            <p className="text-xs sm:text-sm text-purple-200 font-medium max-w-2xl leading-relaxed">
              Bẻ nhỏ Functional Chunks • Phản xạ 1s bật nghĩa • Đoán hướng trả lời • Shadowing nối âm nuốt âm • Vạch trần bẫy ETS.
            </p>
          </div>
          <Link
            to="/part2-coach"
            onClick={() => trackEvent("click_part2_coach", { source: "showcase_banner" })}
            className="py-3 px-6 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] shrink-0 relative z-10 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>Trải Nghiệm 8 Bước Ngay</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Lưới khóa học Listening */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-2xl bg-slate-800/60" />
            ))}
          </div>
        ) : listeningCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {listeningCourses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}

            {/* Card Khám Phá Thêm Dictation */}
            {listeningCourses.length <= 2 && (
              <Link
                to="/part2-coach"
                className="group rounded-2xl border-2 border-dashed border-slate-800 hover:border-purple-500/60 bg-slate-900/40 hover:bg-purple-950/20 p-6 flex flex-col justify-between items-stretch gap-4 transition-all duration-200 cursor-pointer min-h-[260px]"
              >
                <div className="space-y-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-purple-500/30">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                      Kho Bài Nghe Mở Rộng
                    </span>
                    <h3 className="text-base font-extrabold text-white group-hover:text-purple-300 transition-colors">
                      Xem Tất Cả Bài Dictation &amp; Phản Xạ
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                      Hơn 100 bài nghe chép chính tả Part 1–4, bẻ nhỏ câu thoại theo cụm, nhận diện nuốt âm và nối từ.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    Bắt âm chuẩn xác
                  </span>
                  <span className="py-2 px-3.5 rounded-xl font-bold text-xs bg-purple-600 group-hover:bg-purple-500 text-white inline-flex items-center gap-1.5 transition-colors shadow-xs">
                    <span>Vào luyện nghe</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Đang cập nhật bài luyện nghe...</p>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: KHÓA HỌC VIDEO NGHE - ĐỌC 700+                                 */}
      {/* ========================================================================= */}
      <section
        id="section-video"
        className="rounded-3xl border border-blue-500/25 bg-[#081226]/85 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-[0_10px_35px_rgba(0,0,0,0.5)] scroll-mt-24 transition-all"
      >
        {/* Header Kệ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 p-2 flex items-center justify-center border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] shrink-0">
              <img src={iconVideo} alt="" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg sm:text-2xl font-black text-white font-display tracking-wide">
                  KHÓA HỌC VIDEO <span className="text-blue-400">NGHE - ĐỌC 700+</span>
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  {videoCourses.length} khóa học
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm font-medium">
                Chiến thuật xử lý nhanh Part 1–7, mẹo tránh bẫy 5 giây, bứt phá 700+ đến 850+.
              </p>
            </div>
          </div>
        </div>

        {/* Lưới khóa học Video */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-2xl bg-slate-800/60" />
            ))}
          </div>
        ) : videoCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {videoCourses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}

            {/* Card Khám Phá Thêm Video */}
            {videoCourses.length <= 2 && (
              <Link
                to="/#combos"
                className="group rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-500/60 bg-slate-900/40 hover:bg-blue-950/20 p-6 flex flex-col justify-between items-stretch gap-4 transition-all duration-200 cursor-pointer min-h-[260px]"
              >
                <div className="space-y-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-blue-500/30">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                      Kho Khóa Học Mở Rộng
                    </span>
                    <h3 className="text-base font-extrabold text-white group-hover:text-blue-300 transition-colors">
                      Xem Toàn Bộ Video Bài Giảng TOEIC
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                      Hệ thống bài giảng từ nền tảng 450 đến bứt phá 850+, chia theo từng chuyên đề Part 1–7 kèm tài liệu PDF.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    Cập nhật liên tục
                  </span>
                  <span className="py-2 px-3.5 rounded-xl font-bold text-xs bg-blue-600 group-hover:bg-blue-500 text-white inline-flex items-center gap-1.5 transition-colors shadow-xs">
                    <span>Xem lộ trình</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Đang cập nhật khóa học video...</p>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: KHỐI UỐN CONG NAVY IIG - KHU VỰC TRÒ CHƠI HỌC TỪ VỰNG           */}
      {/* ========================================================================= */}
      <section
        id="section-games"
        className="curved-navy-container p-6 sm:p-8 md:p-10 space-y-8 relative overflow-hidden"
      >
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-cyan-500/20">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-black uppercase tracking-wider">
              <Gamepad2 className="w-4 h-4 text-cyan-400" />
              <span>ARCADE GAMIFICATION · VỪA HỌC VỪA CHƠI</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-display tracking-wide">
              KHU VỰC TRÒ CHƠI HỌC TỪ VỰNG THEO BỘ TỪ VỰNG TÙY CHỌN
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm font-medium">
              Chọn bộ từ vựng yêu thích (TOEIC 600 từ, Giao tiếp, Công nghệ...) và chiến game ngay!
            </p>
          </div>

          <Link
            to="/games"
            onClick={() => trackEvent("click_arcade_view_all", { source: "games_header" })}
            className="py-2.5 px-5 rounded-xl font-black text-xs text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 hover:border-cyan-400 transition-all inline-flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.25)] shrink-0 self-start md:self-auto cursor-pointer"
          >
            <span>Vào đấu trường Game</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Bento Grid 2 Game Chủ Lực + Thẻ Bộ Từ Vựng */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {/* Card 1: Word Defense (Thủ Thành PvZ) */}
          <div className="group rounded-2xl border border-emerald-500/30 bg-[#071329]/90 hover:border-emerald-400/60 p-6 flex flex-col justify-between space-y-5 transition-all duration-300 shadow-[0_4px_25px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 p-1 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform shrink-0">
                  <img src={iconWordDefense} alt="Word Defense" className="w-full h-full object-contain drop-shadow" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  MỚI • PVZ STYLE
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-white group-hover:text-emerald-300 transition-colors font-display">
                  Word Defense: Cuộc Chiến Khu Vườn
                </h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Bảo vệ khu vườn bằng cách gõ từ vựng triệu hồi Đậu Thần, Băng Tiễn, Bom Anh Đào. Giải mã khiên quái vật, luyện phản xạ từ vựng cấp tốc.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Chọn mọi bộ từ vựng</span>
              <Link
                to="/games/word-defense"
                onClick={() => trackEvent("click_play_defense", { source: "homepage_bento" })}
                className="py-2 px-4 rounded-xl font-black text-xs text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] inline-flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>⚔️ Chơi Ngay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Word Shooter (Bắn Chữ Không Gian) */}
          <div className="group rounded-2xl border border-cyan-500/30 bg-[#071329]/90 hover:border-cyan-400/60 p-6 flex flex-col justify-between space-y-5 transition-all duration-300 shadow-[0_4px_25px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 p-1 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform shrink-0">
                  <img src={iconWordShooter} alt="Word Shooter" className="w-full h-full object-contain drop-shadow" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  HOT • NÂNG CẤP 2.0
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-white group-hover:text-cyan-300 transition-colors font-display">
                  Phi Cơ Diệt Từ Vựng (Sky Strike 2.0)
                </h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Lái chiến đấu cơ bắn nổ từ vựng đang rơi bằng cách gõ phím. Tích hợp audio phát âm chuẩn TTS, popup nghĩa nổ và đóng băng từ đặc biệt.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Có Audio TTS &amp; PvP</span>
              <Link
                to="/games/word-shooter"
                onClick={() => trackEvent("click_play_shooter", { source: "homepage_bento" })}
                className="py-2 px-4 rounded-xl font-black text-xs text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_15px_rgba(6,182,212,0.4)] inline-flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>🚀 Xuất Kích</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: Kho Bộ Từ Vựng Tùy Chọn */}
          <div className="group rounded-2xl border border-purple-500/30 bg-[#071329]/90 hover:border-purple-400/60 p-6 flex flex-col justify-between space-y-5 transition-all duration-300 shadow-[0_4px_25px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 p-1 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform shrink-0">
                  <img src={iconVocabPacks} alt="Vocab Packs" className="w-full h-full object-contain drop-shadow" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  TÙY CHỌN BỘ TỪ
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-white group-hover:text-purple-300 transition-colors font-display">
                  Kho Bộ Từ Vựng Đa Dạng
                </h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Tùy ý nạp bộ từ: <strong>TOEIC 600 Master</strong>, <strong>Giao tiếp hàng ngày</strong>, <strong>Công nghệ</strong>, <strong>Động vật</strong> hoặc tự tạo bộ từ vựng cá nhân để chơi game.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">1.000+ từ cốt lõi</span>
              <Link
                to="/games"
                onClick={() => trackEvent("click_view_vocab_packs", { source: "homepage_bento" })}
                className="py-2 px-4 rounded-xl font-black text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] inline-flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>🕹️ Vào Kho Game</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5: NÂNG CẤP VIP TRỌN ĐỜI (COMBO DARK CARD VIỀN VÀNG NEON)           */}
      {/* ========================================================================= */}
      <div
        id="combos"
        className="relative overflow-hidden rounded-3xl border-2 border-amber-400/80 bg-gradient-to-br from-[#0c1629] via-[#080f1e] to-[#040810] text-white p-6 sm:p-8 md:p-10 shadow-[0_0_45px_rgba(245,158,11,0.25)] scroll-mt-24"
      >
        {/* Glow ambient effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Cột Trái: Quyền Lợi VIP (7 Cột) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-black uppercase tracking-wider backdrop-blur-xs">
                <img src={iconVipCrown} alt="" className="w-5 h-5 object-contain inline-block" />
                <span>GÓI VIP TOÀN DIỆN TOEIC · ƯU ĐÃI ĐỢT 1 TIẾT KIỆM 50%</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white font-display tracking-wide leading-tight">
                NÂNG CẤP VIP TRỌN ĐỜI
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed max-w-2xl">
                Mở khóa vĩnh viễn toàn bộ kho đề thi ETS 200 câu có giải chi tiết, hệ thống Dictation 8 bước và trọn bộ video bài giảng Part 1–7.
              </p>
            </div>

            {/* 4 Quyền Lợi Cốt Lõi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">Kho Đề Full Test ETS 200 Câu</h4>
                  <p className="text-[11px] text-slate-400">Format 2026 chuẩn 120 phút, giải chi tiết 100%.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-400/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-purple-400/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">Luyện Nghe Dictation Không Giới Hạn</h4>
                  <p className="text-[11px] text-slate-400">Quy trình 8 bước độc quyền bẻ nhỏ âm thanh.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-400/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-blue-400/20 text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">Trọn Bộ Video Bài Giảng Part 1–7</h4>
                  <p className="text-[11px] text-slate-400">Chiến thuật 5 giây xử lý bẫy ngữ pháp &amp; từ loại.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-400/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">Cố Vấn Đồng Hành 1-1 Qua Zalo</h4>
                  <p className="text-[11px] text-slate-400">Giải đáp thắc mắc câu hỏi khó 24/7 trực tiếp.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cột Phải: Thẻ Vé VIP Ticket Giá Sốc (5 Cột) */}
          <div className="lg:col-span-5">
            <div className="bg-[#0b172d]/90 backdrop-blur-md rounded-2xl border-2 border-amber-400/60 p-6 flex flex-col items-center text-center space-y-4 shadow-[0_0_35px_rgba(245,158,11,0.2)] relative">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-[11px] font-black uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-red-400" />
                <span>TIẾT KIỆM 1.750.000 Đ</span>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 line-through font-bold">
                  Giá gốc: 3.500.000 đ
                </span>
                <div className="text-3xl sm:text-4xl font-black text-amber-300 tracking-tight font-tech">
                  1.750.000 đ
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  Thanh toán 1 lần duy nhất để học trọn đời
                </p>
              </div>

              <button
                onClick={() => {
                  trackEvent("click_combo", { location: "showcase_vip_card" });
                  setModalOpen(true);
                }}
                className="w-full py-3.5 rounded-2xl text-sm sm:text-base font-black text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:shadow-[0_0_35px_rgba(245,158,11,0.7)] flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <img src={iconVipCrown} alt="" className="w-5 h-5 object-contain inline-block" />
                <span>MUA GÓI VIP TRỌN GÓI</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Kích hoạt tài khoản tự động ngay sau khi chuyển khoản</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 CAM KẾT CHUẨN KHẢO THÍ ETS                                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#081226]/80 border border-slate-800 flex items-center gap-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 p-1.5 flex items-center justify-center border border-emerald-500/30 shrink-0">
            <img src={iconEtsSeal} alt="" className="w-full h-full object-contain drop-shadow" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white font-tech">Bộ Đề Chuẩn ETS</h4>
            <p className="text-[11px] text-slate-400 font-medium">Format 2026 sát đề thi thật</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#081226]/80 border border-slate-800 flex items-center gap-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 p-1.5 flex items-center justify-center border border-amber-500/30 shrink-0">
            <img src={iconArcade} alt="" className="w-full h-full object-contain drop-shadow" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white font-tech">Game Từ Vựng Tùy Chọn</h4>
            <p className="text-[11px] text-slate-400 font-medium">Luyện thi vui, nhớ từ siêu tốc</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#081226]/80 border border-slate-800 flex items-center gap-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-purple-500/15 p-1.5 flex items-center justify-center border border-purple-500/30 shrink-0">
            <img src={iconDictation} alt="" className="w-full h-full object-contain drop-shadow" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white font-tech">Dictation Đột Phá</h4>
            <p className="text-[11px] text-slate-400 font-medium">Quy trình 8 bước bứt phá Listening</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#081226]/80 border border-slate-800 flex items-center gap-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 p-1.5 flex items-center justify-center border border-blue-500/30 shrink-0">
            <img src={iconShield} alt="" className="w-full h-full object-contain drop-shadow" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white font-tech">Đồng Hành 1-1</h4>
            <p className="text-[11px] text-slate-400 font-medium">Cố vấn giải đáp 24/7 qua Zalo</p>
          </div>
        </div>
      </div>

      {/* MODAL THANH TOÁN VIETQR COMBO KHÓA HỌC */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg p-6 rounded-3xl bg-[#09152b] border border-cyan-500/30 text-white">
          <DialogHeader className="space-y-2 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 p-2 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <img src={iconGift} alt="" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            <DialogTitle className="text-xl font-black text-white font-display">
              Đăng Ký Gói Combo Khóa Học VIP
            </DialogTitle>
            <p className="text-xs text-slate-300">
              Quét mã VietQR chuyển khoản tự động để kích hoạt tài khoản học viên ngay lập tức.
            </p>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-[#0c1f40] border border-cyan-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-cyan-400">
                  GÓI HỌC TOÀN DIỆN
                </span>
                <h4 className="font-black text-sm text-white font-display">
                  Combo TOEIC VIP Toàn Bộ Khóa Học &amp; Đề Thi
                </h4>
                <span className="text-xs text-slate-400">Thời hạn: Vĩnh viễn (Kèm toàn bộ bản cập nhật)</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-amber-300 font-tech">
                  1.750.000 đ
                </span>
                <span className="text-xs text-slate-500 line-through block">
                  3.500.000 đ
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-700 bg-white">
              <img
                src="https://api.vietqr.io/image/970422-0334729066-qj9Rj0t.jpg?accountName=HOANG%20CONG%20LUAN&amount=1750000&addInfo=VIP%20LENGLISH"
                alt="VietQR Chuyển Khoản"
                className="w-48 h-48 object-contain"
              />
            </div>

            <div className="text-center space-y-1 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <p className="font-bold text-slate-200">
                Ngân hàng: <span className="text-cyan-400 font-extrabold">MBBank</span> | STK: <span className="text-cyan-400 font-extrabold">0334729066</span>
              </p>
              <p className="font-bold text-slate-200">
                Chủ tài khoản: <span className="text-white font-extrabold">HOANG CONG LUAN</span>
              </p>
              <p className="text-slate-400">
                Nội dung CK: <strong className="text-amber-300 font-mono">VIP [SĐT Của Bạn]</strong>
              </p>
            </div>

            <div className="pt-2 text-center">
              <a
                href="https://zalo.me/0334729066"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("click_zalo", { source: "combo_payment_modal" })}
                className="w-full py-3 rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
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
