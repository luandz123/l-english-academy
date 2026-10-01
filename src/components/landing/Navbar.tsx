import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
        {/* Left Section: Mobile Menu Trigger & Logo & Khám Phá */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Hamburger trigger for mobile sheet */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Mở menu danh mục"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo brand */}
          <div className="flex items-center gap-2">
            <Logo showText={true} imgClassName="w-8 h-8" />
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/50">
              ETS 2026
            </span>
          </div>

          {/* Dropdown Menu "Khám phá" */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                <LayoutGrid className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Khám phá</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80 p-2 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800">
              <div className="px-2 py-1.5 text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
                Phòng Luyện Thi & Tiện Ích
              </div>
              <DropdownMenuItem asChild>
                <a href="#section-fulltest" className="flex items-start gap-3 p-2 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/80">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      Thi Thử Full Test ETS
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">200 CÂU</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Format chuẩn ETS, bấm giờ thật 120 phút</p>
                  </div>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="#section-listening" className="flex items-start gap-3 p-2 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/80">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      Nghe Chép Chính Tả (Dictation)
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">HOT</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Bắt âm từng câu, chỉnh lỗi nuốt âm, nối âm</p>
                  </div>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/part2-coach" className="flex items-start gap-3 p-2 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/80">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      Phản Xạ Part 2 Coach
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">8 BƯỚC</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Luyện tốc độ phản xạ hỏi - đáp tức thì</p>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/games" className="flex items-start gap-3 p-2 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/80">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Gamepad2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      Khu Trò Chơi Arcade
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">ARCADE</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Word Shooter &amp; Word Defense vui nhộn</p>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1 text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
                Khóa Học Video &amp; Combo
              </div>
              <DropdownMenuItem asChild>
                <a href="#section-video" className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-800/80">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>Khóa học TOEIC 2 &amp; 4 kỹ năng</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="#combos" className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-orange-600 dark:text-orange-400">
                  <Flame className="w-4 h-4" />
                  <span>Combo tiết kiệm (Lộ trình 0 lên 850+)</span>
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center Section: Quick Nav Links */}
        <nav className="hidden xl:flex items-center gap-1">
          <a
            href="#section-video"
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-zinc-800/70 transition-colors"
          >
            Khóa học
          </a>
          <a
            href="#section-fulltest"
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/70 dark:hover:bg-zinc-800/70 transition-colors flex items-center gap-1.5"
          >
            <span>Thi thử ETS</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              200 Câu
            </span>
          </a>
          <a
            href="#section-listening"
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50/70 dark:hover:bg-zinc-800/70 transition-colors flex items-center gap-1.5"
          >
            <span>Luyện nghe</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              HOT
            </span>
          </a>
          <Link
            to="/games"
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50/70 dark:hover:bg-zinc-800/70 transition-colors flex items-center gap-1.5"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-cyan-500" />
            <span>Trò chơi</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
              Arcade
            </span>
          </Link>
          <a
            href="#combos"
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50/70 dark:hover:bg-zinc-800/70 transition-colors flex items-center gap-1.5"
          >
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span>Hot combo</span>
          </a>
        </nav>

        {/* Right Section: Search & Auth */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end max-w-md">
          {/* Search bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex-1 max-w-[200px] sm:max-w-[240px] hidden md:block"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm khóa học, đề thi..."
              className="w-full pl-8.5 pr-3 py-1.5 rounded-full text-xs bg-slate-100 dark:bg-zinc-800/80 text-foreground border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all placeholder:text-muted-foreground/70"
            />
          </form>

          {/* User state */}
          {user ? (
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* NÚT VÀO BÀN HỌC - REDIRECT VÀO KHO KHÓA HỌC (/library) */}
              <Link
                to="/library"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Vào bàn học</span>
                <span className="sm:hidden">Bàn học</span>
              </Link>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-slate-200 dark:border-zinc-700 hover:border-blue-500 bg-white dark:bg-zinc-900 shadow-xs transition-colors cursor-pointer outline-none">
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
                    <p className="text-[11px] text-muted-foreground truncate font-normal mt-0.5">{email}</p>
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
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/login"
                className="py-1.5 px-3 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="btn-3d btn-3d-primary py-1.5 px-3.5 rounded-xl text-xs font-bold text-white shadow-xs flex items-center gap-1.5"
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
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  ETS 2026
                </span>
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
                <p className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider mb-2">
                  Luyện Thi &amp; Công Cụ
                </p>
                <div className="space-y-1">
                  <a
                    href="#section-fulltest"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      <FileCheck2 className="w-4 h-4 text-emerald-600" />
                      <span>Thi Thử Full Test ETS</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      200 CÂU
                    </span>
                  </a>

                  <a
                    href="#section-listening"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      <Headphones className="w-4 h-4 text-purple-600" />
                      <span>Nghe Chép Chính Tả</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                      HOT
                    </span>
                  </a>

                  <Link
                    to="/part2-coach"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>Phản Xạ Part 2 Coach</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      8 BƯỚC
                    </span>
                  </Link>

                  <Link
                    to="/games"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      <Gamepad2 className="w-4 h-4 text-cyan-500" />
                      <span>Khu Trò Chơi Arcade</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                      ARCADE
                    </span>
                  </Link>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider mb-2">
                  Khóa Học &amp; Lộ Trình
                </p>
                <div className="space-y-1">
                  <a
                    href="#section-video"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>Khóa học TOEIC Video</span>
                  </a>

                  <a
                    href="#combos"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                  >
                    <Flame className="w-4 h-4" />
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
                  <GraduationCap className="w-4 h-4" />
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
