import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import {
  Menu,
  Search,
  BookOpen,
  Flame,
  Zap,
  LogOut,
  User,
  Gamepad2,
  GraduationCap,
  LayoutGrid,
  ChevronDown,
  FileCheck2,
  Headphones,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Home,
  BookA,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import iconFulltest from "@/assets/icons/icon-fulltest.webp";
import iconDictation from "@/assets/icons/icon-dictation.webp";
import iconReflex from "@/assets/icons/icon-reflex.webp";
import iconArcade from "@/assets/icons/icon-arcade.webp";
import iconVideo from "@/assets/icons/icon-video.webp";
import iconFlame from "@/assets/icons/icon-flame.webp";
import iconGradcap from "@/assets/icons/icon-gradcap.webp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface NavbarProps {
  onOpenSidebar?: () => void;
}

const Navbar = ({ onOpenSidebar }: NavbarProps) => {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      if (q.includes("test") || q.includes("đề") || q.includes("ets")) {
        const el = document.getElementById("section-fulltest");
        if (el) el.scrollIntoView({ behavior: "smooth" });
        else navigate("/fulltests");
        return;
      }
      if (q.includes("nghe") || q.includes("dictation") || q.includes("chép")) {
        const el = document.getElementById("section-listening");
        if (el) el.scrollIntoView({ behavior: "smooth" });
        else navigate("/listening");
        return;
      }
      if (q.includes("game") || q.includes("chơi") || q.includes("trò chơi")) {
        navigate("/games");
        return;
      }
      const el = document.getElementById("section-video") || document.getElementById("combos");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate("/#section-video");
      }
    }
  };

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Học viên";
  const initials = displayName.charAt(0).toUpperCase();
  const email = user?.email || "";

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Left Section: Mobile Menu Trigger & Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Hamburger trigger for mobile sheet */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Mở menu danh mục"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo brand (no badge) */}
          <Logo showText={true} imgClassName="w-8 h-8" />
        </div>

        {/* Center Section: 6 Clean Nav Items (Khám phá · Khóa học · Thi thử · Luyện nghe · Trò chơi · 🔥 Combo) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5">
          {/* 1. Dropdown Khám phá */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none active:scale-95">
                <LayoutGrid className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Khám phá</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-84 p-2 rounded-2xl shadow-soft-lg border border-border/70 bg-card space-y-1">
              <div className="px-3 py-1.5 text-xs font-bold uppercase text-muted-foreground tracking-wider">
                Phòng Luyện Thi &amp; Tiện Ích
              </div>
              <DropdownMenuItem asChild>
                <a
                  href="#section-fulltest"
                  onClick={() => trackEvent("click_nav_item", { name: "dropdown_fulltest" })}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-muted/80 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 p-1 flex items-center justify-center shrink-0">
                    <img src={iconFulltest} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground">Thi Thử Full Test ETS</div>
                    <p className="text-xs text-muted-foreground truncate font-normal">200 câu chuẩn ETS, bấm giờ 120 phút</p>
                  </div>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="#section-listening"
                  onClick={() => trackEvent("click_nav_item", { name: "dropdown_dictation" })}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-muted/80 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 p-1 flex items-center justify-center shrink-0">
                    <img src={iconDictation} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground">Nghe Chép Chính Tả</div>
                    <p className="text-xs text-muted-foreground truncate font-normal">Bắt âm từng câu, chỉnh lỗi nuốt âm</p>
                  </div>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  to="/part2-coach"
                  onClick={() => trackEvent("click_nav_item", { name: "dropdown_part2_coach" })}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-muted/80 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 p-1 flex items-center justify-center shrink-0">
                    <img src={iconReflex} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground">Phản Xạ Part 2 Coach</div>
                    <p className="text-xs text-muted-foreground truncate font-normal">Luyện tốc độ phản xạ hỏi - đáp 8 bước</p>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  to="/games"
                  onClick={() => trackEvent("click_nav_item", { name: "dropdown_arcade" })}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-muted/80 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 p-1 flex items-center justify-center shrink-0">
                    <img src={iconArcade} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground">Khu Trò Chơi Arcade</div>
                    <p className="text-xs text-muted-foreground truncate font-normal">Vừa chơi vừa ghi nhớ từ vựng phản xạ</p>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 border-border/50" />
              <div className="px-3 py-1.5 text-xs font-bold uppercase text-muted-foreground tracking-wider">
                Khóa Học Video &amp; Combo
              </div>
              <DropdownMenuItem asChild>
                <a
                  href="#section-video"
                  onClick={() => trackEvent("click_nav_item", { name: "dropdown_video" })}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-muted/80 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 p-1 flex items-center justify-center shrink-0">
                    <img src={iconVideo} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground">Khóa Học TOEIC Video</div>
                    <p className="text-xs text-muted-foreground truncate font-normal">Bài giảng chi tiết theo từng Part 1–7</p>
                  </div>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="#combos"
                  onClick={() => trackEvent("click_combo", { location: "navbar_dropdown" })}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-orange-50/80 dark:hover:bg-orange-950/40 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/50 p-1 flex items-center justify-center shrink-0">
                    <img src={iconFlame} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-orange-600 dark:text-orange-400">Combo Trọn Gói 0 lên 850+</div>
                    <p className="text-xs text-orange-600/80 dark:text-orange-400/80 truncate font-normal">Tiết kiệm 40%, mở khóa toàn bộ nền tảng</p>
                  </div>
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 2. Khóa học */}
          <a
            href="#section-video"
            onClick={() => trackEvent("click_nav_item", { name: "khoa_hoc" })}
            className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-zinc-800/70 transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none active:scale-95"
          >
            <img src={iconVideo} alt="" className="w-4 h-4 object-contain inline-block shrink-0" />
            <span>Khóa học</span>
          </a>

          {/* 3. Thi thử */}
          <a
            href="#section-fulltest"
            onClick={() => trackEvent("click_nav_item", { name: "thi_thu" })}
            className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/70 dark:hover:bg-zinc-800/70 transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none active:scale-95"
          >
            <img src={iconFulltest} alt="" className="w-4 h-4 object-contain inline-block shrink-0" />
            <span>Thi thử</span>
          </a>

          {/* 4. Luyện nghe */}
          <a
            href="#section-listening"
            onClick={() => trackEvent("click_nav_item", { name: "luyen_nghe" })}
            className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50/70 dark:hover:bg-zinc-800/70 transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none active:scale-95"
          >
            <img src={iconDictation} alt="" className="w-4 h-4 object-contain inline-block shrink-0" />
            <span>Luyện nghe</span>
          </a>

          {/* 5. Trò chơi */}
          <Link
            to="/games"
            onClick={() => trackEvent("click_nav_item", { name: "tro_choi" })}
            className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50/70 dark:hover:bg-zinc-800/70 transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none active:scale-95"
          >
            <img src={iconArcade} alt="" className="w-4 h-4 object-contain inline-block shrink-0" />
            <span>Trò chơi</span>
          </Link>

          {/* 6. 🔥 Combo */}
          <a
            href="#combos"
            onClick={() => trackEvent("click_combo", { location: "navbar" })}
            className="px-3 py-2 rounded-xl text-sm font-bold text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap shadow-2xs cursor-pointer select-none active:scale-95"
          >
            <img src={iconFlame} alt="" className="w-4 h-4 object-contain inline-block shrink-0" />
            <span>Combo</span>
          </a>
        </nav>

        {/* Right Section: Search & Auth */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 justify-end">
          {/* Search bar: visible on xl desktop */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative w-36 lg:w-44 xl:w-52 hidden xl:block shrink"
          >
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm khóa học, đề..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-full text-xs bg-slate-100 dark:bg-zinc-800/80 text-foreground border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all placeholder:text-muted-foreground/70"
            />
          </form>

          {/* User state */}
          {user ? (
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* NÚT VÀO BÀN HỌC - REDIRECT VÀO KHO KHÓA HỌC (/library) */}
              <Link
                to="/library"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 shrink-0"
              >
                <img src={iconGradcap} alt="" className="w-5 h-5 object-contain shrink-0 drop-shadow-xs" />
                <span className="hidden sm:inline">Vào bàn học</span>
                <span className="sm:hidden">Bàn học</span>
              </Link>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-slate-200 dark:border-zinc-700 hover:border-blue-500 bg-white dark:bg-zinc-900 shadow-xs transition-colors cursor-pointer outline-none shrink-0">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-zinc-700"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        {initials}
                      </div>
                    )}
                    <span className="text-xs font-bold text-foreground hidden xl:inline max-w-[100px] truncate">
                      {displayName}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 p-1.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl"
                >
                  <DropdownMenuLabel className="px-3 py-2">
                    <p className="font-bold text-xs text-foreground truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate font-normal mt-0.5">{email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate("/library")}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer text-blue-600 dark:text-blue-400"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Kho khóa học của tôi</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/fulltests")}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                    <span>Phòng thi Full Test ETS</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/listening")}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    <Headphones className="w-4 h-4 text-purple-600" />
                    <span>Nghe chép chính tả</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/profile")}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>Hồ sơ cá nhân &amp; Điểm số</span>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => navigate("/admin/dashboard")}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-amber-600 dark:text-amber-400 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Quản trị Admin</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Link
                to="/login"
                className="hidden sm:inline-flex py-1.5 px-3 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="btn-3d btn-3d-primary py-1.5 px-3 sm:px-3.5 rounded-xl text-xs font-bold text-white shadow-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span>Bắt đầu ngay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer (Sheet) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[300px] sm:w-[340px] p-0 flex flex-col justify-between">
          <div className="p-5 flex-1 overflow-y-auto space-y-5">
            <SheetHeader className="text-left pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <Logo showText={true} imgClassName="w-8 h-8" />
              </div>
              <SheetTitle className="sr-only">Menu Điều Hướng</SheetTitle>
            </SheetHeader>

            {/* Mobile search form */}
            <form onSubmit={(e) => { handleSearchSubmit(e); setMobileMenuOpen(false); }} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm khóa học, đề thi..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-zinc-800 text-foreground outline-none border border-transparent focus:border-blue-500"
              />
            </form>

            {/* Danh mục tính năng */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">
                  Luyện Thi &amp; Công Cụ
                </p>
                <div className="space-y-1">
                  <a
                    href="#section-fulltest"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img src={iconFulltest} alt="" className="w-5 h-5 object-contain" />
                      <span>Thi Thử Full Test ETS</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </a>

                  <a
                    href="#section-listening"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img src={iconDictation} alt="" className="w-5 h-5 object-contain" />
                      <span>Nghe Chép Chính Tả (Dictation)</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </a>

                  <Link
                    to="/part2-coach"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img src={iconReflex} alt="" className="w-5 h-5 object-contain" />
                      <span>Phản Xạ Part 2 Coach</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  <Link
                    to="/games"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img src={iconArcade} alt="" className="w-5 h-5 object-contain" />
                      <span>Khu Trò Chơi Arcade</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">
                  Khóa Học &amp; Lộ Trình
                </p>
                <div className="space-y-1">
                  <a
                    href="#section-video"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    <img src={iconVideo} alt="" className="w-5 h-5 object-contain" />
                    <span>Khóa học TOEIC Video</span>
                  </a>

                  <a
                    href="#combos"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                  >
                    <img src={iconFlame} alt="" className="w-5 h-5 object-contain" />
                    <span>Gói Combo Tiết Kiệm</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Drawer Actions */}
          <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50">
            {user ? (
              <div className="space-y-2">
                <Link
                  to="/library"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm"
                >
                  <img src={iconGradcap} alt="" className="w-5 h-5 object-contain" />
                  <span>Vào Bàn Học (Kho Khóa Học)</span>
                </Link>

                <div className="flex items-center justify-between pt-1">
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-foreground flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Hồ sơ cá nhân</span>
                  </Link>

                  <button
                    onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-center rounded-xl text-xs font-bold border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-center rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default Navbar;
