import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu,
  Search,
  BookOpen,
  Flame,
  Zap,
  BookA,
  LogOut,
  User,
  ShoppingBag,
  Gamepad2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  onOpenSidebar?: () => void;
}

const Navbar = ({ onOpenSidebar }: NavbarProps) => {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
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
    "";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-b border-blue-100/80 dark:border-zinc-800 shadow-[0_8px_30px_-24px_rgba(37,99,235,.7)]">
      <div className="flex items-center justify-between h-16 px-4 md:px-6 gap-3">
        {/* Left: Mobile Drawer Trigger & Search */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          {onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Mở menu danh mục"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Mobile Logo if sidebar is hidden */}
          <div className="lg:hidden">
            <Logo showText={false} imgClassName="w-8 h-8" />
          </div>

          {/* Search bar (giống style Ngoại Ngữ 24h) */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex-1 max-w-sm hidden sm:block"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm khóa học, đề thi, từ vựng..."
              className="w-full pl-9 pr-4 py-1.5 rounded-full text-xs bg-slate-100 dark:bg-zinc-800 text-foreground border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all"
            />
          </form>
        </div>

        {/* Center-Right Quick Links (Phong cách Ngoại Ngữ 24h: Khóa học, Hot combo, Phòng thi thực chiến, Tra từ) */}
        <div className="hidden xl:flex items-center gap-1.5">
          <a
            href="#section-video"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-blue-600 hover:bg-blue-50/60 dark:hover:bg-zinc-800 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>Khóa học</span>
          </a>

          <a
            href="#combos"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-orange-600 hover:bg-orange-50/60 dark:hover:bg-zinc-800 transition-colors"
          >
            <Flame className="w-4 h-4 text-orange-500" />
            <span>Hot combo</span>
          </a>

          <a
            href="#section-fulltest"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-indigo-600 hover:bg-indigo-50/60 dark:hover:bg-zinc-800 transition-colors relative"
          >
            <Zap className="w-4 h-4 text-indigo-600" />
            <span>Phòng thi thực chiến</span>
            <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded text-[9px] font-black uppercase">
              New
            </span>
          </a>

          <Link
            to="/vocab"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-emerald-600 hover:bg-emerald-50/60 dark:hover:bg-zinc-800 transition-colors"
          >
            <BookA className="w-4 h-4 text-emerald-600" />
            <span>Tra từ Flashcard</span>
          </Link>

          <Link
            to="/games"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-cyan-600 hover:bg-cyan-50/60 dark:hover:bg-zinc-800 transition-colors relative"
          >
            <Gamepad2 className="w-4 h-4 text-cyan-500" />
            <span>Khu Trò Chơi</span>
            <span className="px-1.5 py-0.2 bg-cyan-500 text-white rounded text-[9px] font-black uppercase">
              Arcade
            </span>
          </Link>
        </div>

        {/* Right Auth / User Area */}
        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-zinc-700 hover:border-blue-500 transition-colors bg-white dark:bg-zinc-900 shadow-sm">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-black text-white shadow-sm">
                    {initials}
                  </div>
                  <span className="text-xs font-bold text-foreground hidden md:inline">
                    {displayName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-lg"
              >
                <DropdownMenuItem
                  onClick={() => navigate("/profile")}
                  className="font-bold text-xs rounded-lg cursor-pointer"
                >
                  <User className="w-4 h-4 mr-2 text-blue-600" />
                  Hồ sơ cá nhân
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem
                    onClick={() => navigate("/admin/dashboard")}
                    className="font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-rose-600 font-bold text-xs rounded-lg cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="py-1.5 px-3.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="btn-3d btn-3d-primary py-1.5 px-4 rounded-xl text-xs font-bold text-white shadow-sm"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
