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
  FolderOpen,
  Star,
  HelpCircle,
  ChevronDown,
  Trophy,
  Quote,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { CourseCard, CourseRow } from "@/components/CourseCard";
import { trackEvent } from "@/lib/analytics";
import {
  getHomepageShowcaseConfig,
  parseCategoryIconAndDesc,
  generateVietQrUrl,
  calculateSavings,
  DEFAULT_HOMEPAGE_CONFIG,
  HomepageShowcaseConfig,
} from "@/services/homepageShowcaseService";

import iconFulltest from "@/assets/icons/icon-fulltest-3d.webp";
import iconDictation from "@/assets/icons/icon-dictation-3d.webp";
import iconReflex from "@/assets/icons/icon-reflex.webp";
import iconArcade from "@/assets/icons/icon-arcade-3d.webp";
import iconVideo from "@/assets/icons/icon-video-3d.webp";
import iconGift from "@/assets/icons/icon-gift-3d.webp";
import iconShield from "@/assets/icons/icon-shield.webp";
import iconWordDefense from "@/assets/icons/icon-word-defense.webp";
import iconWordShooter from "@/assets/icons/icon-word-shooter.webp";
import iconVocabPacks from "@/assets/icons/icon-vocab-packs.webp";
import iconEtsSeal from "@/assets/icons/icon-ets-seal-3d.webp";
import iconVipCrown from "@/assets/icons/icon-vip-crown-3d.webp";

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  display_order: number | null;
  is_active: boolean | null;
}

const renderCategoryLucideIcon = (iconName?: string | null) => {
  switch ((iconName || "").toLowerCase()) {
    case "headphones":
      return <Headphones className="w-6 h-6 text-purple-400" />;
    case "filecheck2":
      return <FileCheck2 className="w-6 h-6 text-emerald-400" />;
    case "bookopen":
      return <BookOpen className="w-6 h-6 text-cyan-400" />;
    case "layers":
      return <Layers className="w-6 h-6 text-blue-400" />;
    case "graduationcap":
      return <GraduationCap className="w-6 h-6 text-amber-400" />;
    case "sparkles":
      return <Sparkles className="w-6 h-6 text-pink-400" />;
    case "compass":
      return <Compass className="w-6 h-6 text-sky-400" />;
    case "award":
      return <Award className="w-6 h-6 text-yellow-400" />;
    case "gamepad2":
      return <Gamepad2 className="w-6 h-6 text-emerald-400" />;
    case "flame":
      return <Flame className="w-6 h-6 text-orange-400" />;
    case "video":
      return <Video className="w-6 h-6 text-blue-400" />;
    default:
      return <BookOpen className="w-6 h-6 text-cyan-400" />;
  }
};

const getCategoryTheme = (slug: string, index: number) => {
  const s = (slug || "").toLowerCase();
  if (s.includes("fulltest") || s.includes("thi-thu")) {
    return {
      isFullTest: true,
      isListening: false,
      borderClass: "border-emerald-500/25",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      accentText: "text-emerald-400",
      iconImg: iconFulltest,
      iconContainer: "bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]",
      actionBtn: "text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30",
      actionText: "Xem tất cả bộ đề",
      actionLink: "/fulltests",
    };
  }
  if (s.includes("listening") || s.includes("nghe") || s.includes("chep")) {
    return {
      isFullTest: false,
      isListening: true,
      borderClass: "border-purple-500/25",
      badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      accentText: "text-purple-400",
      iconImg: iconDictation,
      iconContainer: "bg-purple-500/15 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]",
      actionBtn: "text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30",
      actionText: "Xem bài Dictation",
      actionLink: "/listening",
    };
  }
  if (s.includes("toeic-2kn") || s.includes("toeic-4kn") || s.includes("video")) {
    return {
      isFullTest: false,
      isListening: false,
      borderClass: "border-blue-500/25",
      badgeClass: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      accentText: "text-blue-400",
      iconImg: iconVideo,
      iconContainer: "bg-blue-500/15 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]",
      actionBtn: "text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30",
      actionText: "Xem khóa học",
      actionLink: "#combos",
    };
  }

  const palettes = [
    {
      borderClass: "border-cyan-500/25",
      badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      accentText: "text-cyan-400",
      iconImg: null,
      iconContainer: "bg-cyan-500/15 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]",
      actionBtn: "text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30",
      actionText: "Xem khóa học",
      actionLink: "#combos",
    },
    {
      borderClass: "border-amber-500/25",
      badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      accentText: "text-amber-400",
      iconImg: null,
      iconContainer: "bg-amber-500/15 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]",
      actionBtn: "text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30",
      actionText: "Xem khóa học",
      actionLink: "#combos",
    },
    {
      borderClass: "border-indigo-500/25",
      badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
      accentText: "text-indigo-400",
      iconImg: null,
      iconContainer: "bg-indigo-500/15 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]",
      actionBtn: "text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30",
      actionText: "Xem khóa học",
      actionLink: "#combos",
    },
  ];
  return {
    isFullTest: false,
    isListening: false,
    ...palettes[index % palettes.length],
  };
};

export const CourseShowcase = () => {
  const [modalOpen, setModalOpen] = useState(false);

  // 1. Lấy toàn bộ Cấu hình Kệ Trang Chủ (Showcase Config) do Admin thiết lập
  const { data: showcaseConfig = DEFAULT_HOMEPAGE_CONFIG } = useQuery<HomepageShowcaseConfig>({
    queryKey: ["homepage-showcase-config"],
    queryFn: () => getHomepageShowcaseConfig(),
  });

  // 2. Lấy toàn bộ DANH MỤC KHÓA HỌC (is_active = true) từ database theo display_order
  const { data: categories = [], isLoading: isLoadingCats } = useQuery<CategoryRow[]>({
    queryKey: ["homepage-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("id", { ascending: true });
      if (error) {
        console.error("Error fetching categories:", error);
        return [];
      }
      return (data || []) as CategoryRow[];
    },
  });

  // 3. Lấy toàn bộ KHÓA HỌC ĐANG HOẠT ĐỘNG (is_active = true) từ database
  const { data: activeCourses = [], isLoading: isLoadingCourses } = useQuery<CourseRow[]>({
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

  const isLoading = isLoadingCats || isLoadingCourses;

  // 4. Nhóm các khóa học theo từng Danh mục
  const categorizedClusters = useMemo(() => {
    return categories
      .map((cat, index) => {
        const { icon: catIcon, description: catDesc } = parseCategoryIconAndDesc(cat.icon);
        const courses = activeCourses.filter((c) => c.category_id === cat.id);
        const theme = getCategoryTheme(cat.slug, index);
        return {
          category: cat,
          catIcon,
          catDesc,
          courses,
          theme,
        };
      })
      .filter((cluster) => cluster.courses.length > 0);
  }, [categories, activeCourses]);

  // 5. Các khóa học chưa được gắn danh mục (nếu có)
  const uncategorizedCourses = useMemo(() => {
    const knownCatIds = new Set(categories.map((c) => c.id));
    return activeCourses.filter((c) => !c.category_id || !knownCatIds.has(c.category_id));
  }, [activeCourses, categories]);

  const { section_toggles, part2_banner, vip_combo, commitments, testimonials, faqs } = showcaseConfig;

  return (
    <div className="space-y-12">
      {/* ========================================================================= */}
      {/* CÁC CỤM KHÓA HỌC PHÂN THEO ĐÚNG DANH MỤC TRONG DATABASE (DYNAMIC)          */}
      {/* ========================================================================= */}
      {section_toggles.show_categories && (
        <>
          {isLoading ? (
            <div className="space-y-12">
              {[1, 2, 3].map((s) => (
                <div key={s} className="rounded-3xl border border-slate-800 bg-[#081226]/85 p-6 sm:p-8 space-y-6">
                  <Skeleton className="h-10 w-72 bg-slate-800/80 rounded-xl" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-80 rounded-2xl bg-slate-800/60" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            categorizedClusters.map((cluster) => {
              const { category: cat, catIcon, catDesc, courses, theme } = cluster;
              const sectionAnchorId =
                cat.slug === "fulltest"
                  ? "section-fulltest"
                  : cat.slug === "listening"
                  ? "section-listening"
                  : cat.slug === "toeic-2kn" || cat.slug === "video"
                  ? "section-video"
                  : `category-${cat.slug}`;

              return (
                <section
                  key={cat.id}
                  id={sectionAnchorId}
                  data-slug={cat.slug}
                  className={`rounded-3xl border ${theme.borderClass} bg-[#081226]/85 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-[0_10px_35px_rgba(0,0,0,0.5)] scroll-mt-24 transition-all`}
                >
                  {/* Secondary anchor tags for smooth scrolling compatibility */}
                  <span id={`category-${cat.slug}`} className="sr-only" />
                  <span id={`section-${cat.slug}`} className="sr-only" />

                  {/* Header Kệ Danh Mục */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl p-2 flex items-center justify-center border shrink-0 ${theme.iconContainer}`}
                      >
                        {theme.iconImg ? (
                          <img src={theme.iconImg} alt="" className="w-full h-full object-contain" />
                        ) : (
                          renderCategoryLucideIcon(catIcon)
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h2 className="text-lg sm:text-2xl font-black text-white font-display tracking-wide">
                            {cat.name.toUpperCase()}
                          </h2>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${theme.badgeClass}`}>
                            {courses.length} {theme.isFullTest ? "bộ đề" : "khóa học"}
                          </span>
                        </div>
                        {catDesc ? (
                          <p className="text-slate-400 text-xs sm:text-sm font-medium">
                            {catDesc}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <Link
                      to={theme.actionLink}
                      onClick={() => trackEvent("click_category_view_all", { slug: cat.slug, id: cat.id })}
                      className={`self-start sm:self-center py-2 px-4 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${theme.actionBtn}`}
                    >
                      <span>{theme.actionText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* BANNER ĐẶC THÙ: Chế độ Luyện Nghe Phản Xạ 8 Bước Part 2 */}
                  {theme.isListening && section_toggles.show_part2_banner && (
                    <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-blue-900/90 rounded-2xl p-6 sm:p-7 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-[0_0_30px_rgba(147,51,234,0.25)] border border-purple-400/40">
                      <div className="space-y-2 relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs font-black uppercase tracking-wider backdrop-blur-xs border border-purple-400/30">
                          <img src={iconReflex} alt="" className="w-4 h-4 object-contain inline-block" />
                          <span>{part2_banner.badge}</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-white font-display">
                          {part2_banner.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-purple-200 font-medium max-w-2xl leading-relaxed">
                          {part2_banner.description}
                        </p>
                      </div>
                      <Link
                        to={part2_banner.button_link}
                        onClick={() => trackEvent("click_part2_coach", { source: "showcase_banner" })}
                        className="py-3 px-6 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] shrink-0 relative z-10 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <span>{part2_banner.button_text}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}

                  {/* Lưới các khóa học thuộc Danh Mục này (Hiển thị 100% dữ liệu Admin) */}
                  {courses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                      {courses.map((c) => (
                        <CourseCard key={c.id} course={{ ...c, category_name: cat.name }} />
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-sm">
                      Đang cập nhật thêm các khóa học và bộ đề mới cho danh mục <strong>{cat.name}</strong>...
                    </div>
                  )}
                </section>
              );
            })
          )}

          {/* CỤM CÁC KHÓA HỌC CHƯA GẮN DANH MỤC (NẾU CÓ) */}
          {!isLoading && uncategorizedCourses.length > 0 && (
            <section
              id="section-uncategorized"
              className="rounded-3xl border border-slate-700/50 bg-[#081226]/85 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-[0_10px_35px_rgba(0,0,0,0.5)] scroll-mt-24 transition-all"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-white font-display">
                      CÁC KHÓA HỌC KHÁC
                    </h2>
                    <p className="text-xs text-slate-400">Toàn bộ khóa học bổ trợ trên hệ thống</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {uncategorizedCourses.length} khóa học
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {uncategorizedCourses.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* SECTION: KHỐI UỐN CONG NAVY IIG - KHU VỰC TRÒ CHƠI HỌC TỪ VỰNG            */}
      {/* ========================================================================= */}
      {section_toggles.show_games && (
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
            {/* Card 1: Word Defense */}
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

            {/* Card 2: Word Shooter */}
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
                    Tùy ý nạp bộ từ: <strong>TOEIC 600 Master</strong>, <strong>Giao tiếp hàng ngày</strong>, <strong>Công nghệ</strong>, hoặc tự tạo bộ từ vựng cá nhân để chơi game.
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
      )}

      {/* ========================================================================= */}
      {/* SECTION: THÀNH TÍCH HỌC VIÊN & CẢM NHẬN ĐIỂM CAO (TESTIMONIALS)            */}
      {/* ========================================================================= */}
      {section_toggles.show_testimonials && testimonials && testimonials.length > 0 && (
        <section
          id="testimonials"
          className="rounded-3xl border border-cyan-500/30 bg-[#081226]/90 backdrop-blur-md p-6 sm:p-8 md:p-10 space-y-8 shadow-[0_10px_35px_rgba(0,0,0,0.5)] scroll-mt-24 relative overflow-hidden"
        >
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-wider">
                <Trophy className="w-4 h-4 text-emerald-400" />
                <span>BẢNG VÀNG THÀNH TÍCH · HỌC VIÊN L-ENGLISH</span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-display tracking-wide">
                KẾT QUẢ THẬT TỪ HỌC VIÊN ĐẠT MỤC TIÊU 750+ ĐẾN 900+ TOEIC
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm font-medium">
                Hơn 12.000+ học viên đã bứt phá điểm số nhanh gấp 3 lần nhờ phương pháp học chủ động và hệ thống đề chuẩn ETS.
              </p>
            </div>
            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold shrink-0 self-start md:self-auto bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-400/20">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="ml-1 text-white font-black">4.9/5</span>
              <span className="text-slate-400">(2.400+ đánh giá)</span>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-slate-800 bg-[#060e1d]/90 hover:border-cyan-500/40 p-6 flex flex-col justify-between space-y-4 transition-all duration-300 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] group"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                        {t.avatar_emoji || "🎓"}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white">{t.name}</h3>
                        {t.target && <p className="text-[11px] text-slate-400">{t.target}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black">
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t.score}</span>
                    {t.score_increase && (
                      <span className="text-[10px] text-emerald-400 font-semibold">({t.score_increase})</span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 font-medium leading-relaxed italic relative pl-3 border-l-2 border-cyan-500/40">
                    "{t.quote}"
                  </p>
                </div>

                <div className="flex items-center gap-1 text-amber-400 pt-2 border-t border-slate-800/80">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-[10px] font-bold text-slate-400 ml-1.5">Đã xác minh điểm thi IIG</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION: NÂNG CẤP VIP TRỌN ĐỜI (COMBO VIỀN VÀNG NEON - DYNAMIC)           */}
      {/* ========================================================================= */}
      {section_toggles.show_vip_combo && (
        <div
          id="combos"
          className="relative overflow-hidden rounded-3xl border-2 border-amber-400/80 bg-gradient-to-br from-[#0c1629] via-[#080f1e] to-[#040810] text-white p-6 sm:p-8 md:p-10 shadow-[0_0_45px_rgba(245,158,11,0.25)] scroll-mt-24"
        >
          {/* Glow ambient effects */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Cột Trái: Quyền Lợi VIP */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-black uppercase tracking-wider backdrop-blur-xs">
                  <img src={iconVipCrown} alt="" className="w-5 h-5 object-contain inline-block" />
                  <span>{vip_combo.badge}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white font-display tracking-wide leading-tight">
                  {vip_combo.title}
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed max-w-2xl">
                  {vip_combo.subtitle}
                </p>
              </div>

              {/* 4 Quyền Lợi Cốt Lõi (Dynamic từ Admin) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {vip_combo.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/40 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-white">{feat.title}</h4>
                      <p className="text-[11px] text-slate-400">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cột Phải: Thẻ Vé VIP Ticket Giá Sốc (Tự Động Tính Tiết Kiệm) */}
            <div className="lg:col-span-5">
              <div className="bg-[#0b172d]/90 backdrop-blur-md rounded-2xl border-2 border-amber-400/60 p-6 flex flex-col items-center text-center space-y-4 shadow-[0_0_35px_rgba(245,158,11,0.2)] relative">
                {(() => {
                  const savingsInfo = calculateSavings(vip_combo.original_price, vip_combo.price);
                  const badgeText = savingsInfo.badgeText || (vip_combo as any).discount_badge;
                  if (!badgeText) return null;
                  return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-[11px] font-black uppercase tracking-wider animate-pulse">
                      <Zap className="w-3.5 h-3.5 text-red-400" />
                      <span>{badgeText}</span>
                    </div>
                  );
                })()}

                <div className="space-y-1">
                  {vip_combo.original_price > 0 && (
                    <span className="text-xs text-slate-400 line-through font-bold">
                      Giá gốc: {vip_combo.original_price.toLocaleString("vi-VN")} đ
                    </span>
                  )}
                  <div className="text-3xl sm:text-4xl font-black text-amber-300 tracking-tight font-tech">
                    {vip_combo.price.toLocaleString("vi-VN")} đ
                  </div>
                  {vip_combo.price_note && (
                    <p className="text-xs text-slate-300 font-medium">
                      {vip_combo.price_note}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => {
                    trackEvent("click_combo", { location: "showcase_vip_card" });
                    setModalOpen(true);
                  }}
                  className="w-full py-3.5 rounded-2xl text-sm sm:text-base font-black text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:shadow-[0_0_35px_rgba(245,158,11,0.7)] flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <img src={iconVipCrown} alt="" className="w-5 h-5 object-contain inline-block" />
                  <span>{vip_combo.cta_text || "MUA GÓI VIP TRỌN GÓI"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {vip_combo.security_note && (
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{vip_combo.security_note}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: GIẢI ĐÁP CÂU HỎI THƯỜNG GẶP (FAQ)                                */}
      {/* ========================================================================= */}
      {section_toggles.show_faq && faqs && faqs.length > 0 && (
        <section
          id="faq"
          className="rounded-3xl border border-indigo-500/25 bg-[#081226]/85 backdrop-blur-md p-6 sm:p-8 md:p-10 space-y-6 shadow-[0_10px_35px_rgba(0,0,0,0.5)] scroll-mt-24 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-2 pb-4 border-b border-slate-800">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-black uppercase tracking-wider">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>HỎI ĐÁP NHANH · GIẢI ĐÁP MỌI THẮC MẮC</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-display tracking-wide">
              CÂU HỎI THƯỜNG GẶP VỀ GÓI HỌC VÀ LỘ TRÌNH L-ENGLISH
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm font-medium">
              Bạn còn băn khoăn? Dưới đây là những câu hỏi thường gặp nhất từ học viên mới.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800/90 bg-[#060e1d]/90 p-5 space-y-2 hover:border-indigo-500/40 transition-colors"
              >
                <h4 className="text-sm font-black text-white flex items-start gap-2.5 font-display">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold">
                    Q
                  </span>
                  <span>{faq.question}</span>
                </h4>
                <p className="text-xs text-slate-300 font-medium leading-relaxed pl-7">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>

          <div className="relative z-10 pt-2 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Vẫn còn câu hỏi chưa được giải đáp?{" "}
              <a
                href={`https://zalo.me/${showcaseConfig.contact_info?.zalo_number || "0334729066"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 font-bold hover:underline inline-flex items-center gap-1 ml-1"
              >
                <span>Nhắn tin Zalo với Thầy Luận ({showcaseConfig.contact_info?.hotline || "0334 729 066"})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </p>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4 CAM KẾT CHUẨN KHẢO THÍ ETS (DYNAMIC)                                    */}
      {/* ========================================================================= */}
      {section_toggles.show_ets_commitments && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {commitments.map((cmt, idx) => {
            const icons = [iconEtsSeal, iconArcade, iconDictation, iconShield];
            const iconImg = icons[idx % icons.length];
            const bgContainers = [
              "bg-emerald-500/15 border-emerald-500/30",
              "bg-amber-500/15 border-amber-500/30",
              "bg-purple-500/15 border-purple-500/30",
              "bg-blue-500/15 border-blue-500/30",
            ];
            return (
              <div
                key={cmt.id || idx}
                className="p-4 rounded-2xl bg-[#081226]/80 border border-slate-800 flex items-center gap-3 shadow-xs"
              >
                <div
                  className={`w-12 h-12 rounded-xl p-1.5 flex items-center justify-center border shrink-0 ${bgContainers[idx % bgContainers.length]}`}
                >
                  <img src={iconImg} alt="" className="w-full h-full object-contain drop-shadow" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white font-tech">{cmt.title}</h4>
                  <p className="text-[11px] text-slate-400 font-medium">{cmt.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL THANH TOÁN VIETQR COMBO KHÓA HỌC (DYNAMIC 100% TỪ ADMIN) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg p-6 rounded-3xl bg-[#09152b] border border-cyan-500/30 text-white">
          <DialogHeader className="space-y-2 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 p-2 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <img src={iconGift} alt="" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            <DialogTitle className="text-xl font-black text-white font-display">
              {vip_combo.title}
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
                  {vip_combo.title}
                </h4>
                <span className="text-xs text-slate-400">{vip_combo.price_note || "Thời hạn: Vĩnh viễn"}</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-amber-300 font-tech">
                  {vip_combo.price.toLocaleString("vi-VN")} đ
                </span>
                {vip_combo.original_price > 0 && (
                  <span className="text-xs text-slate-500 line-through block">
                    {vip_combo.original_price.toLocaleString("vi-VN")} đ
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-700 bg-white">
              <img
                src={generateVietQrUrl(
                  vip_combo.bank_bin,
                  vip_combo.bank_account,
                  vip_combo.account_holder,
                  vip_combo.price,
                  vip_combo.transfer_syntax
                )}
                alt="VietQR Chuyển Khoản"
                className="w-48 h-48 object-contain"
              />
            </div>

            <div className="text-center space-y-1 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <p className="font-bold text-slate-200">
                Ngân hàng: <span className="text-cyan-400 font-extrabold">{vip_combo.bank_name}</span> | STK:{" "}
                <span className="text-cyan-400 font-extrabold">{vip_combo.bank_account}</span>
              </p>
              <p className="font-bold text-slate-200">
                Chủ tài khoản:{" "}
                <span className="text-white font-extrabold">{vip_combo.account_holder}</span>
              </p>
              <p className="text-slate-400">
                Nội dung CK: <strong className="text-amber-300 font-mono">{vip_combo.transfer_syntax}</strong>
              </p>
            </div>

            <div className="pt-2 text-center">
              <a
                href={`https://zalo.me/${showcaseConfig.contact_info?.zalo_number || vip_combo.zalo_hotline || "0334729066"}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("click_zalo", { source: "combo_payment_modal" })}
                className="w-full py-3 rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
              >
                <span>Xác nhận chuyển khoản qua Zalo ({showcaseConfig.contact_info?.hotline || vip_combo.zalo_hotline || "0334 729 066"})</span>
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
