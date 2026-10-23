import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import {
  Menu,
  Search,
  Flame,
  Zap,
  LogOut,
  User,
  Gamepad2,
  GraduationCap,
  LayoutGrid,
  ChevronDown,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Home,
  BookA,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";

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
      if (q.includes("nói") || q.includes("speak") || q.includes("voice") || q.includes("thoại")) {
        navigate("/speaking");
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

  const handleNavClick = (
    e: React.MouseEvent,
    targetId: string,
    eventName: string,
    fallbackRoute?: string
  ) => {
    e.preventDefault();
    trackEvent("click_nav_item", { name: eventName });

    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", `#${targetId}`);
    } else {
      if (window.location.pathname !== "/") {
        navigate(`/#${targetId}`);
      } else if (fallbackRoute) {
        navigate(fallbackRoute);
      } else {
        window.location.hash = `#${targetId}`;
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
  const userAvatar =
    profile?.avatar_url ||
    (user?.user_metadata?.avatar_url as string) ||
    (user?.user_metadata?.picture as string) ||
    null;

  return (
    <header className="sticky top-0 z-40 bg-[#070e1c]/85 backdrop-blur-xl border-b border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.7)] relative before:absolute before:top-0 before:left-0 before:right-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-cyan-500/50 before:to-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Left Section: Mobile Menu Trigger & Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Hamburger trigger for mobile sheet */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
            aria-label="Mở menu danh mục"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo brand (no badge) */}
          <div className="transition-transform hover:scale-105">
            <Logo showText={true} imgClassName="w-8 h-8 drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]" />
          </div>
        </div>

        {/* Center Section: 5 Clean Nav Items Chuẩn Thực Tế */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 p-1 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
          {/* 1. Thi thử */}
          <a
            href="/#section-fulltest"
            onClick={(e) => handleNavClick(e, "section-fulltest", "thi_thu", "/fulltests")}
            className="px-3.5 py-1.5 rounded-xl text-xs xl:text-[13px] font-bold text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 hover:shadow-[0_0_14px_rgba(16,185,129,0.2)] transition-all duration-200 whitespace-nowrap cursor-pointer select-none active:scale-95"
          >
            <span>Phòng Thi Thử</span>
          </a>

          {/* 2. Luyện nghe từng bước */}
          <a
            href="/#section-listening"
            onClick={(e) => handleNavClick(e, "section-listening", "luyen_nghe", "/listening")}
            className="px-3.5 py-1.5 rounded-xl text-xs xl:text-[13px] font-bold text-slate-300 hover:text-purple-300 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/30 hover:shadow-[0_0_14px_rgba(168,85,247,0.2)] transition-all duration-200 whitespace-nowrap cursor-pointer select-none active:scale-95"
          >
            <span>Luyện Nghe Từng Bước</span>
          </a>

          {/* 3. Nghe - Đọc 700+ */}
          <a
            href="/#section-video"
            onClick={(e) => handleNavClick(e, "section-video", "khoa_hoc", "/#section-video")}
            className="px-3.5 py-1.5 rounded-xl text-xs xl:text-[13px] font-bold text-slate-300 hover:text-sky-300 hover:bg-sky-500/10 border border-transparent hover:border-sky-500/30 hover:shadow-[0_0_14px_rgba(14,165,233,0.2)] transition-all duration-200 whitespace-nowrap cursor-pointer select-none active:scale-95"
          >
            <span>Nghe - Đọc 700+</span>
          </a>

          {/* 4. Game Từ Vựng */}
          <a
            href="/#section-games"
            onClick={(e) => handleNavClick(e, "section-games", "tro_choi", "/games")}
            className="px-3.5 py-1.5 rounded-xl text-xs xl:text-[13px] font-bold text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 hover:shadow-[0_0_14px_rgba(6,182,212,0.2)] transition-all duration-200 whitespace-nowrap cursor-pointer select-none active:scale-95"
          >
            <span>Game Từ Vựng</span>
          </a>

          {/* 5. Nâng Cấp VIP */}
          <a
            href="/#combos"
            onClick={(e) => handleNavClick(e, "combos", "vip_combos", "/#combos")}
            className="px-4 py-1.5 rounded-xl text-xs xl:text-[13px] font-black text-amber-300 hover:text-amber-100 bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/20 hover:from-amber-500/25 hover:via-orange-500/25 hover:to-amber-500/30 border border-amber-400/40 hover:border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.25)] hover:shadow-[0_0_24px_rgba(245,158,11,0.45)] transition-all duration-200 whitespace-nowrap cursor-pointer select-none active:scale-95"
          >
            <span>Nâng Cấp VIP</span>
          </a>
        </nav>

        {/* Right Section: Search & Auth */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 justify-end">
          {/* Search bar: visible on xl desktop */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative w-36 lg:w-44 xl:w-52 hidden xl:block shrink"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm khóa học, đề..."
              className="w-full pl-9 pr-3 py-1.5 rounded-full text-xs bg-slate-900/80 text-slate-100 border border-slate-800 focus:border-cyan-400/60 focus:bg-slate-900 focus:shadow-[0_0_12px_rgba(6,182,212,0.25)] outline-none transition-all placeholder:text-slate-400/80"
            />
          </form>

          {/* User state */}
          {user ? (
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* NÚT VÀO BÀN HỌC - REDIRECT VÀO BÀN HỌC TỔNG QUAN (/dashboard) */}
              <Link
                to="/dashboard"
                className="flex items-center justify-center px-4 py-1.5 rounded-full text-xs xl:text-sm font-extrabold text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:shadow-[0_0_28px_rgba(6,182,212,0.55)] border border-cyan-400/30 hover:border-cyan-300/60 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 shrink-0 select-none tracking-tight"
              >
                <span className="hidden sm:inline">Vào bàn học</span>
                <span className="sm:hidden">Bàn học</span>
              </Link>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-slate-700/60 hover:border-cyan-400/60 bg-slate-900/80 hover:bg-slate-800 text-slate-200 shadow-xs transition-all cursor-pointer outline-none shrink-0">
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={displayName}
                        className="w-7 h-7 rounded-full object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        {initials}
                      </div>
                    )}
                    <span className="text-xs font-bold text-slate-200 hidden xl:inline max-w-[100px] truncate">
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
                className="hidden sm:inline-flex py-1.5 px-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors whitespace-nowrap"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="py-1.5 px-3.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all hover:scale-105 active:scale-95"
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
        <SheetContent side="left" className="w-[300px] sm:w-[340px] p-0 flex flex-col justify-between bg-[#070e1c] border-r border-cyan-500/20 text-slate-100">
          <div className="p-5 flex-1 overflow-y-auto space-y-5">
            <SheetHeader className="text-left pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <Logo showText={true} imgClassName="w-8 h-8 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]" />
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
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-900/90 text-slate-100 outline-none border border-cyan-500/20 focus:border-cyan-400"
              />
            </form>

            {/* Danh mục tính năng */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase text-cyan-400/80 tracking-wider mb-2">
                  5 Chuyên Mục Luyện Thi
                </p>
                <div className="space-y-1.5">
                  <a
                    href="/#section-fulltest"
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      handleNavClick(e, "section-fulltest", "thi_thu", "/fulltests");
                    }}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-400 border border-transparent hover:border-emerald-500/20 transition-all"
                  >
                    <span>Phòng Thi Thử (Format ETS)</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </a>

                  <a
                    href="/#section-listening"
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      handleNavClick(e, "section-listening", "luyen_nghe", "/listening");
                    }}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-200 hover:bg-purple-500/10 hover:text-purple-400 border border-transparent hover:border-purple-500/20 transition-all"
                  >
                    <span>Luyện Nghe Từng Bước</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </a>

                  <a
                    href="/#section-video"
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      handleNavClick(e, "section-video", "khoa_hoc", "/#section-video");
                    }}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-200 hover:bg-sky-500/10 hover:text-sky-400 border border-transparent hover:border-sky-500/20 transition-all"
                  >
                    <span>Nghe - Đọc 700+</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </a>

                  <Link
                    to="/speaking"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs text-emerald-300 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all"
                  >
                    <span>Phòng Luyện Nói (Speaking Voice)</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  </Link>

                  <a
                    href="/#section-games"
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      handleNavClick(e, "section-games", "tro_choi", "/games");
                    }}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-400 border border-transparent hover:border-cyan-500/20 transition-all"
                  >
                    <span>Game Từ Vựng (Arcade)</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </a>

                  <a
                    href="/#combos"
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      handleNavClick(e, "combos", "vip_combos", "/#combos");
                    }}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 transition-all"
                  >
                    <span>Nâng Cấp VIP (Tiết Kiệm 50%)</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
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
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center py-2.5 rounded-xl font-extrabold text-xs text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
                >
                  <span>Vào Bàn Học (Tổng Quan)</span>
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
