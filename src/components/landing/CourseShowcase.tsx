import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { listCategories, listCourses } from "@/lib/api/catalog";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  CheckCircle,
  Check,
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
import UpgradeProModal from "@/components/UpgradeProModal";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  getHomepageShowcaseConfig,
  parseCategoryIconAndDesc,
  calculateSavings,
  DEFAULT_HOMEPAGE_CONFIG,
  HomepageShowcaseConfig,
  resolveGameAvatar,
  ARCADE_THEME_STYLES,
  DEFAULT_ARCADE_SECTION,
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
  const [modalStep, setModalStep] = useState<"details" | "checkout">("checkout");

  // 1. Lấy toàn bộ Cấu hình Kệ Trang Chủ (Showcase Config) do Admin thiết lập
  const { data: showcaseConfig = DEFAULT_HOMEPAGE_CONFIG } = useQuery<HomepageShowcaseConfig>({
    queryKey: ["homepage-showcase-config"],
    queryFn: () => getHomepageShowcaseConfig(),
  });

  // 2. Lấy toàn bộ DANH MỤC KHÓA HỌC (is_active = true) từ database theo display_order
  const { data: categories = [], isLoading: isLoadingCats } = useQuery<CategoryRow[]>({
    queryKey: ["homepage-categories"],
    queryFn: async () => {
      const { data, error } = await listCategories({ active: true });
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
      const { data, error } = await listCourses({ active: true });
      if (error) {
        console.error("Error fetching courses:", error);
        return [];
      }
      return data || [];
    },
  });

  const isLoading = isLoadingCats || isLoadingCourses;

  // 4. Nhóm các khóa học theo từng Danh mục (courses.category_id là nguồn sự thật duy nhất)
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

  // 5. Các khóa học chưa được gắn danh mục hoặc danh mục đang tắt (nếu có)
  const uncategorizedCourses = useMemo(() => {
    const knownCatIds = new Set(categories.map((c) => c.id));
    return activeCourses.filter((c) => !c.category_id || !knownCatIds.has(c.category_id));
  }, [activeCourses, categories]);

  const { toast } = useToast();
  const { section_toggles, part2_banner, vip_combo, commitments, testimonials, faqs } = showcaseConfig;
  const arcadeSection = showcaseConfig.arcade_section || DEFAULT_ARCADE_SECTION;

  const visibleArcadeGames = useMemo(() => {
    const games = arcadeSection?.games || DEFAULT_ARCADE_SECTION.games;
    return [...games]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .filter((g) => g.is_active || !g.hide_when_inactive);
  }, [arcadeSection]);

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

              // Badge: dùng "bộ đề" chỉ khi MỌI khóa trong section đều là course_type fulltest; còn lại dùng "khóa học"
              const isAllFullTest = courses.length > 0 && courses.every((c) => c.course_type === "fulltest");

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
                            {courses.length} {isAllFullTest ? "bộ đề" : "khóa học"}
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
                <span>{arcadeSection.badge}</span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-display tracking-wide">
                {arcadeSection.title}
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm font-medium">
                {arcadeSection.description}
              </p>
            </div>

            <Link
              to={arcadeSection.view_all_url || "/games"}
              onClick={() => trackEvent("click_arcade_view_all", { source: "games_header" })}
              className="py-2.5 px-5 rounded-xl font-black text-xs text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 hover:border-cyan-400 transition-all inline-flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.25)] shrink-0 self-start md:self-auto cursor-pointer"
            >
              <span>{arcadeSection.view_all_text || "Vào đấu trường Game"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Bento Grid Dynamic Cards (Sắp xếp theo thứ tự, bật/tắt và ảnh cấu hình) */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {visibleArcadeGames.map((game) => {
              const theme = ARCADE_THEME_STYLES[game.theme_color || "cyan"];
              const avatarSrc = resolveGameAvatar(game.avatar_url);

              if (!game.is_active) {
                return (
                  <div
                    key={game.id}
                    className="group rounded-2xl border border-slate-700/80 bg-[#071329]/80 p-6 flex flex-col justify-between space-y-5 transition-all duration-300 shadow-[0_4px_25px_rgba(0,0,0,0.5)] opacity-80 grayscale-[15%]"
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 p-1 flex items-center justify-center shadow-lg shrink-0 overflow-hidden">
                          <img
                            src={avatarSrc}
                            alt={game.title}
                            className="w-full h-full object-contain drop-shadow opacity-75"
                          />
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          🔒 TẠM BẢO TRÌ
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-lg font-black text-slate-300 font-display">
                          {game.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                          {game.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">{game.footer_tag}</span>
                      <button
                        type="button"
                        onClick={() =>
                          toast({
                            title: `🔒 Trò chơi "${game.title}" đang tạm tắt`,
                            description: "Game đang được bảo trì hoặc cập nhật tính năng mới. Vui lòng quay lại sau nhé!",
                          })
                        }
                        className="py-2 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 inline-flex items-center gap-1.5 transition-all cursor-not-allowed"
                      >
                        <span>🔒 Đang Bảo Trì</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={game.id}
                  className={cn(
                    "group rounded-2xl border bg-[#071329]/90 p-6 flex flex-col justify-between space-y-5 transition-all duration-300 shadow-[0_4px_25px_rgba(0,0,0,0.5)]",
                    theme.border,
                    theme.borderHover,
                    theme.shadowHover
                  )}
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div
                        className={cn(
                          "w-14 h-14 rounded-2xl p-1 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform shrink-0 border overflow-hidden",
                          theme.avatarBg,
                          theme.avatarBorder,
                          theme.avatarShadow
                        )}
                      >
                        <img
                          src={avatarSrc}
                          alt={game.title}
                          className="w-full h-full object-contain drop-shadow"
                        />
                      </div>
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold border",
                          theme.badgeBg,
                          theme.badgeText,
                          theme.badgeBorder
                        )}
                      >
                        {game.badge}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <h3
                        className={cn(
                          "text-lg font-black text-white transition-colors font-display",
                          theme.titleHover
                        )}
                      >
                        {game.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                        {game.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">{game.footer_tag}</span>
                    <Link
                      to={game.action_url}
                      onClick={() =>
                        trackEvent("click_play_game", {
                          game_id: game.id,
                          source: "homepage_bento",
                        })
                      }
                      className={cn(
                        "py-2.5 px-4.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r inline-flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer",
                        theme.buttonGradient,
                        theme.buttonShadow
                      )}
                    >
                      <span>{game.action_text}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
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
                        <h3 className="text-sm sm:text-base font-black text-white">{t.name}</h3>
                        {t.target && <p className="text-xs text-slate-300 font-medium">{t.target}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-black">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>{t.score}</span>
                    {t.score_increase && (
                      <span className="text-xs text-emerald-300 font-bold">({t.score_increase})</span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed italic relative pl-3 border-l-2 border-cyan-500/40">
                    "{t.quote}"
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-amber-400 pt-2.5 border-t border-slate-800/80">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-xs font-semibold text-slate-300 ml-1.5">Đã xác minh điểm thi IIG</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION: NÂNG CẤP VIP TRỌN ĐỜI (THIẾT KẾ PRO PLAN CAO CẤP THEO MẪU)       */}
      {/* ========================================================================= */}
      {section_toggles.show_vip_combo && (
        <div
          id="combos"
          className="relative overflow-hidden rounded-[32px] sm:rounded-[36px] border border-[#2d2f5e]/90 bg-gradient-to-b from-[#181938] via-[#121327] to-[#0c0d1d] text-white p-6 sm:p-8 md:p-10 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_50px_rgba(84,82,238,0.2)] scroll-mt-24"
        >
          {/* Ambient Glow Effects (Tím Indigo Dịu Mắt) */}
          <div className="absolute -top-28 left-1/4 w-[500px] h-[300px] bg-[#5452ee]/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-28 right-10 w-[450px] h-[260px] bg-purple-600/15 rounded-full blur-[130px] pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Cột Trái: Quyền Lợi VIP */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#5452ee]/15 text-[#a2a4f6] border border-[#5452ee]/30 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                  <img src={iconVipCrown} alt="" className="w-4 h-4 object-contain inline-block" />
                  <span>{vip_combo.badge}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-bold text-white font-serif tracking-tight leading-tight">
                  {vip_combo.title}
                </h2>
                <p className="text-[#9597be] text-sm sm:text-base font-normal leading-relaxed max-w-2xl">
                  {vip_combo.subtitle}
                </p>
              </div>

              {/* 4 Quyền Lợi Cốt Lõi (Dynamic từ Admin) - Dấu Tích Tròn Trắng Theo Mẫu Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {vip_combo.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-4 rounded-2xl bg-[#1c1d38]/80 hover:bg-[#202142] border border-white/5 hover:border-[#5452ee]/40 transition-all shadow-xs group"
                  >
                    <div className="w-5 h-5 rounded-full bg-white text-[#121327] flex items-center justify-center shrink-0 mt-0.5 shadow-sm group-hover:scale-105 transition-transform">
                      <Check className="w-3.5 h-3.5 stroke-[3] text-[#121327]" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">{feat.title}</h4>
                      {feat.desc && (
                        <p className="text-xs sm:text-[13px] text-[#9597be] font-normal leading-relaxed">{feat.desc}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cột Phải: Thẻ Vé VIP Ticket Giá Sốc (Thiết kế Good Deal chuẩn mẫu reference) */}
            <div className="lg:col-span-5">
              <div className="bg-[#161732]/95 backdrop-blur-md rounded-[28px] border-2 border-[#5452ee] p-6 sm:p-8 flex flex-col items-center text-center space-y-4 shadow-[0_0_35px_rgba(84,82,238,0.25)] relative overflow-hidden">
                {/* Subtle top glow inside the card */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-[#5452ee]/30 rounded-full blur-2xl pointer-events-none" />

                {(() => {
                  const savingsInfo = calculateSavings(vip_combo.original_price, vip_combo.price);
                  const badgeText = savingsInfo.badgeText || (vip_combo as any).discount_badge;
                  if (!badgeText) return null;
                  return (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#5452ee] text-white text-xs font-bold uppercase tracking-wide shadow-[0_0_15px_rgba(84,82,238,0.4)]">
                      <Zap className="w-3.5 h-3.5 text-white" />
                      <span>{badgeText}</span>
                    </div>
                  );
                })()}

                <div className="space-y-1">
                  {vip_combo.original_price > 0 && (
                    <span className="text-xs sm:text-sm text-[#797b9e] line-through font-medium block">
                      Giá gốc: {vip_combo.original_price.toLocaleString("vi-VN")} đ
                    </span>
                  )}
                  <div className="text-3xl sm:text-4xl md:text-[40px] font-extrabold text-white tracking-tight font-sans">
                    {vip_combo.price.toLocaleString("vi-VN")} đ
                  </div>
                  {vip_combo.price_note && (
                    <p className="text-xs sm:text-sm text-[#9597be] font-normal">
                      {vip_combo.price_note}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => {
                    trackEvent("click_combo", { location: "showcase_vip_card" });
                    setModalStep("checkout");
                    setModalOpen(true);
                  }}
                  className="w-full py-4 rounded-xl text-sm sm:text-base font-bold text-white bg-[#5452ee] hover:bg-[#4745dc] active:scale-[0.98] shadow-[0_4px_25px_rgba(84,82,238,0.45)] flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer"
                >
                  <img src={iconVipCrown} alt="" className="w-5 h-5 object-contain inline-block" />
                  <span>{vip_combo.cta_text || "MUA GÓI VIP TRỌN GÓI"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {vip_combo.security_note && (
                  <div className="text-xs sm:text-[13px] text-[#9597be] flex items-center justify-center gap-2 font-normal">
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
                  <h4 className="text-xs sm:text-sm font-black text-white font-tech">{cmt.title}</h4>
                  <p className="text-xs text-slate-300 font-medium">{cmt.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL NÂNG CẤP PRO PLAN (MATCHING SAMPLE DESIGN 1:1) */}
      <UpgradeProModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        vipCombo={vip_combo}
        initialStep={modalStep}
      />
    </div>
  );
};

export default CourseShowcase;
