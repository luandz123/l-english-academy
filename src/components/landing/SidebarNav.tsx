import { Link, useLocation } from "react-router-dom";
import Logo from "@/components/Logo";
import { listCategories } from "@/lib/api/catalog";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  BookOpen,
  Layers,
  GraduationCap,
  Headphones,
  FileCheck2,
  Sparkles,
  Award,
  Phone,
  MessageCircle,
  Compass,
  X,
  ShieldCheck,
  FolderOpen,
  Rocket,
  Gamepad2,
} from "lucide-react";

interface SidebarNavProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const getCategoryIcon = (slug?: string, iconName?: string | null) => {
  if (iconName === "Headphones" || slug === "listening") return Headphones;
  if (iconName === "FileCheck2" || slug === "fulltest") return FileCheck2;
  if (iconName === "Sparkles" || slug === "vocab" || slug === "flashcard") return Sparkles;
  if (iconName === "GraduationCap" || slug === "cap3" || slug === "lay-goc") return GraduationCap;
  if (iconName === "Layers" || slug === "basic" || slug === "toeic-4kn") return Layers;
  if (iconName === "Compass" || slug === "lotrinh") return Compass;
  if (iconName === "Award" || slug === "ranking") return Award;
  if (iconName === "BookOpen" || slug === "toeic" || slug === "toeic-2kn") return BookOpen;
  return FolderOpen;
};

const getCategoryLink = (cat: { id: number; slug: string }): string | null => {
  if (cat.slug === "fulltest" || cat.id === 8) return "#section-fulltest";
  if (cat.slug === "listening" || cat.id === 7) return "#section-listening";
  if (cat.slug === "toeic-2kn" || cat.slug === "toeic-4kn" || cat.id === 1 || cat.id === 5) return "#section-video";
  if (cat.slug === "lay-goc" || cat.id === 6) return "#section-video";
  if (cat.slug === "vocab" || cat.slug === "flashcard") return null;
  if (cat.slug === "lotrinh") return "#combos";
  if (cat.slug === "ranking") return null;
  return "#combos";
};

const getCategoryBadge = (slug: string) => {
  if (slug === "listening") return { text: "HOT", color: "bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60" };
  if (slug === "fulltest") return { text: "ETS", color: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700" };
  return null;
};

export const SidebarNav = ({ isOpen = false, onClose }: SidebarNavProps) => {
  const location = useLocation();

  // Truy vấn trực tiếp toàn bộ danh mục từ database Supabase
  const { data: categories = [] } = useQuery({
    queryKey: ["sidebar-course-categories"],
    queryFn: async () => {
      const { data, error } = await listCategories({ active: true });
      if (error) {
        console.error("Error fetching categories:", error);
        return [];
      }
      return data || [];
    },
  });

  const sidebarContent = (
    <aside className="w-72 h-full flex flex-col justify-between bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 select-none">
      {/* Top: Logo & Menu Danh Mục Liền Mạch Không Phân Chia */}
      <div className="flex-1 overflow-y-auto px-4 py-5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800/80 mb-4">
          <div>
            <Logo showText={true} />
            <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 mt-1 pl-1">
              Luyện Thi TOEIC Gamification
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Danh sách danh mục liền mạch (Không ghi DB, Không chia khối) */}
        <nav className="space-y-1">
          {/* Trang chủ */}
          <Link
            to="/"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-150 ${
              location.pathname === "/" && !location.hash
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                : "text-slate-600 dark:text-zinc-400 hover:text-blue-600 hover:bg-blue-50/70 dark:hover:bg-zinc-800/60"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                location.pathname === "/" && !location.hash
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"
              }`}
            >
              <Home className="w-3.5 h-3.5" />
            </div>
            <span>Trang chủ</span>
          </Link>

          {/* Khu Trò Chơi */}
          <Link
            to="/games"
            onClick={onClose}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-150 ${
              location.pathname.startsWith("/games")
                ? "bg-cyan-600 text-white shadow-sm shadow-cyan-500/20"
                : "text-slate-600 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50/70 dark:hover:bg-zinc-800/60"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  location.pathname.startsWith("/games")
                    ? "bg-white/20 text-white"
                    : "bg-cyan-100 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400"
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Khu Trò Chơi</span>
            </div>
            <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-slate-400 dark:text-zinc-500">
              Arcade
            </span>
          </Link>

          {/* Các mục danh mục lấy trực tiếp từ Database */}
          {categories
            .filter((cat) => getCategoryLink(cat) !== null)
            .map((cat) => {
              const Icon = getCategoryIcon(cat.slug, cat.icon);
              const href = getCategoryLink(cat)!;
            const isAnchor = href.startsWith("#");
            const isActive = isAnchor
              ? location.hash === href
              : location.pathname + location.search === href;

            const badge = getCategoryBadge(cat.slug);

            const itemContent = (
              <div
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-150 group ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                    : "text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-zinc-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 group-hover:text-blue-600 group-hover:bg-blue-100 dark:group-hover:bg-blue-950/50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{cat.name}</span>
                </div>

                {badge && (
                  <span
                    className={`shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded text-xs font-extrabold ${
                      isActive ? "bg-white/20 text-white" : badge.color
                    }`}
                  >
                    {badge.text}
                  </span>
                )}
              </div>
            );

            const targetHref = isAnchor && location.pathname !== "/" ? `/${href}` : href;
            return isAnchor ? (
              <a
                key={cat.id}
                href={targetHref}
                onClick={onClose}
                className="block"
              >
                {itemContent}
              </a>
            ) : (
              <Link
                key={cat.id}
                to={href}
                onClick={onClose}
                className="block"
              >
                {itemContent}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Mentor Profile Card & Contact Info */}
      <div className="p-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/40">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3 border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-2.5">
          {/* Avatar & Name */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-emerald-500 p-0.5 shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                  alt="L-English Academic Team"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900">
                <ShieldCheck className="w-2.5 h-2.5" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <h4 className="font-black text-xs text-foreground truncate">
                  L-English Mentor
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium truncate">
                Cố vấn chuyên môn ETS
              </p>
            </div>
          </div>

          {/* Badges điểm số */}
          <div className="grid grid-cols-2 gap-1.5 text-center">
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-lg py-1 px-1.5">
              <span className="block text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">
                ETS TOEIC
              </span>
              <span className="block text-xs font-black text-foreground">
                990/990
              </span>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-lg py-1 px-1.5">
              <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                IELTS ACADEMIC
              </span>
              <span className="block text-xs font-black text-foreground">
                8.5+
              </span>
            </div>
          </div>

          {/* Nút tư vấn lộ trình */}
          <a
            href="https://zalo.me/0334729066"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black text-center flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Tư vấn lộ trình học</span>
          </a>

          {/* Hotline & Social Icons */}
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
            <a
              href="tel:0334729066"
              className="text-xs font-bold text-slate-600 dark:text-zinc-400 flex items-center gap-1 hover:text-blue-600"
            >
              <Phone className="w-3 h-3 text-emerald-600" />
              <span>0334.729.066</span>
            </a>

            <div className="flex items-center gap-1.5">
              <a
                href="https://zalo.me/0334729066"
                target="_blank"
                rel="noopener noreferrer"
                title="Zalo tư vấn"
                className="w-6 h-6 rounded-full bg-blue-50 dark:bg-zinc-800 text-blue-600 flex items-center justify-center hover:scale-110 transition-transform text-xs font-black"
              >
                Z
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                title="Fanpage Facebook"
                className="w-6 h-6 rounded-full bg-blue-50 dark:bg-zinc-800 text-blue-600 flex items-center justify-center hover:scale-110 transition-transform text-xs font-black"
              >
                f
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                title="Kênh TikTok"
                className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center hover:scale-110 transition-transform text-xs font-black"
              >
                ♪
              </a>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <div className="hidden lg:block w-72 h-screen sticky top-0 shrink-0 z-40">
        {sidebarContent}
      </div>

      {/* Mobile Backdrop Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="relative z-10 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default SidebarNav;
