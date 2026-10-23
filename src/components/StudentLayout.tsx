import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard,
  BookOpen, 
  GraduationCap,
  User, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  Sparkles, 
  ShieldCheck,
  FileCheck2,
  Headphones,
  Flame, 
  Zap,
  Gamepad2,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  Crown,
  ArrowRight,
  Mic2
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import UpgradeProModal from "@/components/UpgradeProModal";
import { 
  getHomepageShowcaseConfig, 
  calculateSavings, 
  type HomepageShowcaseConfig 
} from "@/services/homepageShowcaseService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import GamificationChips from "@/components/GamificationChips";

const primaryNavItems = [
  { to: "/dashboard", label: "Bàn học", icon: LayoutDashboard },
  { to: "/speaking", label: "Phòng Luyện Nói", icon: Mic2 },
  { to: "/library", label: "Kho khóa học", icon: BookOpen },
  { to: "/my-courses", label: "Khóa học của tôi", icon: GraduationCap },
  { to: "/fulltests", label: "Luyện đề", icon: FileCheck2 },
  { to: "/listening", label: "Nghe Chép Chính Tả", icon: Headphones },
  { to: "/part2-coach", label: "Luyện Nghe Từng Phần", icon: Zap },
  { to: "/games", label: "Trò Chơi", icon: Gamepad2 },
];

const secondaryNavItems: Array<{ to: string; label: string; icon: any; badge?: string }> = [];

const mobileNavItems = [
  { to: "/dashboard", label: "Bàn học", icon: LayoutDashboard },
  { to: "/my-courses", label: "Của tôi", icon: GraduationCap },
  { to: "/fulltests", label: "Luyện đề", icon: FileCheck2 },
  { to: "/listening", label: "Chép chính tả", icon: Headphones },
  { to: "/part2-coach", label: "Từng phần", icon: Zap, isHighlight: true },
];

const StudentLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("lenglish_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("lenglish_sidebar_collapsed", String(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, isAdmin, isPro } = useAuth();

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeInitialStep, setUpgradeInitialStep] = useState<"details" | "checkout">("details");
  const [vipComboConfig, setVipComboConfig] = useState<HomepageShowcaseConfig["vip_combo"] | null>(null);

  useEffect(() => {
    getHomepageShowcaseConfig().then((cfg) => {
      if (cfg?.vip_combo) setVipComboConfig(cfg.vip_combo);
    });
  }, []);

  useEffect(() => {
    const handleOpenUpgrade = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.step) {
        setUpgradeInitialStep(customEvent.detail.step);
      } else {
        setUpgradeInitialStep("details");
      }
      setUpgradeModalOpen(true);
    };
    window.addEventListener("open-upgrade-pro", handleOpenUpgrade);
    return () => window.removeEventListener("open-upgrade-pro", handleOpenUpgrade);
  }, []);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Học viên";
  const initials = displayName.charAt(0).toUpperCase();
  const email = user?.email || "";
  const avatarUrl =
    profile?.avatar_url ||
    (user?.user_metadata?.avatar_url as string) ||
    (user?.user_metadata?.picture as string) ||
    null;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const isPart2Active = location.pathname.startsWith("/part2-coach");
  const isFullTestActive = location.pathname === "/fulltests" || location.pathname.includes("/fulltest");
  const isListeningActive = location.pathname === "/listening" || location.pathname.includes("/dictation");
  const isLibraryActive = location.pathname === "/library";
  const isMyCoursesActive = location.pathname === "/my-courses";
  const isGamesActive = location.pathname.startsWith("/games");

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = `/${pathSegments.slice(0, index + 1).join("/")}`;
    let label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    if (segment === "courses") label = "Khóa học";
    if (segment === "dashboard") label = "Bàn học";
    if (segment === "my-courses") label = "Khóa học của tôi";
    if (segment === "profile") label = "Hồ sơ";
    if (segment === "learn") label = "Bài học";
    if (segment === "quiz") label = "Bài tập";
    if (segment === "dictation") label = "Luyện nghe";
    if (segment === "fulltest") label = "Full Test";
    if (segment === "part2-coach") label = "Luyện Nghe Từng Bước";
    if (segment === "fulltests") label = "Luyện đề";
    if (segment === "listening") label = "Nghe Chép Chính Tả";
    if (segment === "library") label = "Kho khóa học";
    if (segment === "games") label = "Trò Chơi";
    return { path, label };
  });

  return (
    <div className="min-h-screen flex bg-[#050914] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-x-hidden font-sans">
      {/* Subtle Background Grid & Ambient Glow matching Homepage */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none z-0" />
      <div className="fixed -top-28 -right-28 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none z-0" />
      <div className="fixed -bottom-28 -left-28 w-[550px] h-[550px] rounded-full bg-blue-600/10 blur-[160px] pointer-events-none z-0" />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop & Drawer Sidebar */}
      <aside
        className={cn(
          "fixed md:sticky top-0 z-40 h-screen bg-[#070e1c]/95 border-r border-slate-800/80 backdrop-blur-xl flex flex-col transition-all duration-300 ease-in-out shrink-0",
          isCollapsed ? "md:w-[72px]" : "md:w-[260px]",
          sidebarOpen ? "translate-x-0 w-[260px]" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn("h-16 border-b border-slate-800/80 flex items-center justify-between", isCollapsed ? "px-3 justify-center" : "px-5")}>
          <Logo imgClassName="w-8 h-8" showText={!isCollapsed} />
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 text-muted-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-xl"
            onClick={toggleCollapse}
            title={isCollapsed ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </Button>
        </div>

        {/* User preview */}
        {!isCollapsed ? (
          <div className="p-3 mx-3 my-3 rounded-xl bg-[#030712]/70 border border-slate-800/80 flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-10 h-10 rounded-full object-cover border border-cyan-500/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-cyan-500/15 text-cyan-400 font-bold text-sm flex items-center justify-center border border-cyan-500/30">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{displayName}</p>
              <p className="text-xs text-slate-300 truncate font-medium">{email}</p>
            </div>
          </div>
        ) : (
          <div className="py-4 flex justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-10 h-10 rounded-full object-cover border border-cyan-500/30" title={`${displayName} (${email})`} />
            ) : (
              <div className="w-10 h-10 rounded-full bg-cyan-500/15 text-cyan-400 font-bold text-sm flex items-center justify-center border border-cyan-500/30" title={`${displayName} (${email})`}>
                {initials}
              </div>
            )}
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
          {primaryNavItems.map((item) => {
            const active = 
              item.to === "/my-courses"
                ? isMyCoursesActive
                : item.to.includes("part2-coach")
                ? isPart2Active
                : item.to.includes("fulltest")
                ? isFullTestActive
                : item.to.includes("listening")
                ? isListeningActive
                : item.to === "/library"
                ? isLibraryActive
                : item.to === "/games"
                ? isGamesActive
                : location.pathname === item.to;

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-xl text-sm font-bold transition-all group relative active:scale-95 duration-150",
                  isCollapsed ? "justify-center p-2.5" : "justify-between px-3.5 py-2.5",
                  active
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black shadow-md shadow-amber-500/25"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                )}
              >
                <div className={cn("flex items-center min-w-0", isCollapsed ? "justify-center" : "gap-3")}>
                  <item.icon className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", active ? "text-white" : "text-slate-400 group-hover:text-cyan-400")} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>
              </Link>
            );
          })}

          {/* Active whitespace separation before secondary utility items: Khu vực khác */}
          {isAdmin && (
            <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-1.5">
              {!isCollapsed && (
                <p className="px-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Khu vực khác
                </p>
              )}
              <Link
                to="/admin/dashboard"
                title={isCollapsed ? "Quản trị Admin" : undefined}
                className={cn(
                  "flex items-center rounded-xl text-sm font-bold text-amber-300 hover:bg-amber-950/40 transition-all active:scale-95",
                  isCollapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2"
                )}
              >
                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                {!isCollapsed && <span>Quản trị Admin</span>}
              </Link>
            </div>
          )}
        </nav>

        {/* VIP Upgrade Banner hoặc Thẻ Học Viên VIP PRO */}
        {isPro ? (
          !isCollapsed ? (
            <div className="mx-3 my-2 p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-[#15162d]/90 to-[#0e0f20]/90 border border-emerald-500/40 text-left relative overflow-hidden shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
                  <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                </div>
                <span className="text-xs font-black text-emerald-300 uppercase tracking-wider font-serif">
                  THÀNH VIÊN VIP PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug font-medium">
                Đã mở khóa trọn đời toàn bộ khóa học, đề thi ETS & tính năng cao cấp!
              </p>
            </div>
          ) : (
            <div className="py-2 flex justify-center">
              <div
                title="Học viên VIP PRO Trọn Đời"
                className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-center text-amber-300 shadow-sm"
              >
                <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
              </div>
            </div>
          )
        ) : !isCollapsed ? (
          <div className="mx-3 my-2 p-3.5 rounded-2xl bg-gradient-to-br from-[#1c1d3b]/90 via-[#15162d]/90 to-[#0e0f20]/90 border border-[#2e3160] text-left relative overflow-hidden group shadow-md">
            <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-[#5452ee]/20 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-[#5452ee]/20 border border-[#5452ee]/40 flex items-center justify-center text-[#797af5] shrink-0">
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                </div>
                <span className="text-xs font-black text-white uppercase tracking-wider font-serif truncate">
                  {vipComboConfig?.title || "VIP TRỌN ĐỜI"}
                </span>
              </div>
              {(() => {
                const savings = calculateSavings(vipComboConfig?.original_price || 0, vipComboConfig?.price || 0);
                const badgeText = vipComboConfig?.discount_badge || (savings.percent > 0 ? `-${savings.percent}%` : "ƯU ĐÃI");
                return (
                  <span className="bg-[#5452ee] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0">
                    {badgeText}
                  </span>
                );
              })()}
            </div>
            <p className="text-xs text-slate-300 leading-snug mb-3 font-medium line-clamp-2">
              {vipComboConfig?.subtitle || "Mở khóa toàn bộ kho đề ETS 200 câu & hệ thống Dictation 8 bước!"}
            </p>
            <button
              type="button"
              onClick={() => {
                setUpgradeInitialStep("details");
                setUpgradeModalOpen(true);
              }}
              className="inline-flex items-center justify-center w-full py-2.5 px-3 rounded-xl bg-[#5452ee] hover:bg-[#4745dc] text-white font-bold text-xs shadow-md shadow-[#5452ee]/25 transition-all active:scale-95 cursor-pointer gap-1.5"
            >
              <span>
                {vipComboConfig?.cta_text || (vipComboConfig?.price ? `Nâng Cấp (${vipComboConfig.price.toLocaleString("vi-VN")}đ)` : "Nâng Cấp VIP")}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="py-2 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setUpgradeInitialStep("details");
                setUpgradeModalOpen(true);
              }}
              title={vipComboConfig?.price ? `Nâng cấp VIP (${vipComboConfig.price.toLocaleString("vi-VN")}đ)` : "Nâng cấp VIP"}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1c1d3b] to-[#121327] border border-[#2e3160] hover:border-[#5452ee] flex items-center justify-center text-[#797af5] hover:text-white shadow-sm transition-all active:scale-95 cursor-pointer relative group"
            >
              <Crown className="w-4 h-4 group-hover:scale-110 transition-transform text-amber-300" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#5452ee] rounded-full ring-2 ring-[#070e1c] animate-pulse" />
            </button>
          </div>
        )}

        {/* Bottom sign out & home link */}
        <div className="p-3 border-t border-slate-800/80 space-y-1">
          <Link
            to="/"
            title={isCollapsed ? "Về Trang chủ" : undefined}
            className={cn(
              "flex items-center rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all active:scale-95 w-full text-left",
              isCollapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2.5"
            )}
          >
            <Home className="w-4 h-4 shrink-0 text-cyan-400" />
            {!isCollapsed && <span>Về Trang chủ</span>}
          </Link>
          <button
            onClick={handleSignOut}
            title={isCollapsed ? "Đăng xuất" : undefined}
            className={cn(
              "flex items-center rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-rose-400 hover:bg-rose-950/30 transition-all active:scale-95 w-full text-left",
              isCollapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2.5"
            )}
          >
            <LogOut className="w-4 h-4 shrink-0 text-rose-500" />
            {!isCollapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-[#070e1c]/85 backdrop-blur-md border-b border-slate-800/80 flex items-center px-4 md:px-6 justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Logo on mobile for instant brand identity */}
            <div className="md:hidden flex items-center gap-2 shrink-0">
              <Logo imgClassName="w-7 h-7" />
            </div>

            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 text-slate-400 hover:text-white" onClick={() => setSidebarOpen(true)} title="Mở menu">
              <Menu className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex h-8 w-8 text-slate-400 hover:text-white shrink-0 rounded-lg mr-1"
              onClick={toggleCollapse}
              title={isCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </Button>
            
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-400 overflow-hidden">
              <Link to="/" className="hover:text-cyan-400 transition-colors flex items-center gap-1" title="Về Trang chủ">
                <Home className="w-3.5 h-3.5" />
                <span>Trang chủ</span>
              </Link>
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={crumb.path}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <Link 
                    to={crumb.path} 
                    className={cn(
                      "truncate max-w-[150px] transition-colors",
                      i === breadcrumbs.length - 1 ? "text-cyan-300 font-semibold" : "hover:text-slate-200"
                    )}
                  >
                    {crumb.label}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Nút Nâng cấp PRO hoặc Huy hiệu VIP PRO */}
            {!isPro ? (
              <button
                type="button"
                onClick={() => {
                  setUpgradeInitialStep("details");
                  setUpgradeModalOpen(true);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#5452ee]/20 to-purple-600/20 hover:from-[#5452ee]/30 hover:to-purple-600/30 border border-[#5452ee]/40 text-indigo-200 hover:text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(84,82,238,0.2)] active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#797af5]" />
                <span>Nâng Cấp PRO</span>
              </button>
            ) : (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>VIP PRO</span>
              </div>
            )}

            <GamificationChips />

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-primary/20 transition-all outline-none cursor-pointer">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover border border-slate-700" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center shadow-sm">
                      {initials}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 bg-[#070e1c] shadow-xl rounded-xl border border-slate-800 text-slate-100">
                <DropdownMenuLabel className="px-3 py-2">
                  <p className="font-semibold text-sm text-white truncate">{displayName}</p>
                  <p className="text-xs text-slate-400 font-normal truncate mt-0.5">{email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-800" />
                {isPro ? (
                  <div className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-emerald-400 bg-emerald-950/30 rounded-lg">
                    <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>Học viên VIP PRO Trọn Đời</span>
                  </div>
                ) : (
                  <DropdownMenuItem
                    onClick={() => {
                      setUpgradeInitialStep("details");
                      setUpgradeModalOpen(true);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#797af5] hover:bg-[#5452ee]/15 cursor-pointer font-bold"
                  >
                    <Crown className="w-4 h-4 text-[#797af5]" />
                    Nâng cấp gói PRO
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-800/80 cursor-pointer">
                    <User className="w-4 h-4 text-slate-400" />
                    Hồ sơ cá nhân
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-amber-400 hover:bg-amber-950/40 cursor-pointer">
                      <ShieldCheck className="w-4 h-4" />
                      Admin Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-950/30 cursor-pointer">
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main page content container - padding bottom ensures content isn't covered by mobile bottom nav */}
        <main className="flex-1 p-3.5 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden bg-transparent pb-24 md:pb-8 relative z-10">{children}</main>

        {/* Mobile Bottom Navigation Bar (Ultra Ergonomic & Modern) */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#070e1c]/95 backdrop-blur-xl border-t border-slate-800/80 shadow-[0_-4px_24px_rgba(0,0,0,0.6)] pb-[env(safe-area-inset-bottom,0px)]">
          <div className="flex items-center justify-around h-16 px-1">
            {mobileNavItems.map((item) => {
              const isActive = 
                item.to.includes("part2-coach")
                  ? isPart2Active
                  : item.to.includes("fulltest")
                  ? isFullTestActive
                  : item.to.includes("listening")
                  ? isListeningActive
                  : item.to === "/library"
                  ? isLibraryActive
                  : location.pathname === item.to;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 py-1.5 px-0.5 rounded-xl transition-all relative select-none active:scale-90",
                    isActive
                      ? "text-amber-500 dark:text-amber-400 font-bold"
                      : "text-muted-foreground hover:text-foreground font-semibold"
                  )}
                >
                  {isActive && (
                    <span className="absolute top-1 w-6 h-1 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-in fade-in zoom-in-50 duration-200" />
                  )}
                  
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                    isActive ? "bg-amber-500/15 text-amber-500 dark:text-amber-400 scale-110" : ""
                  )}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  
                  <span className="text-xs tracking-tight leading-tight mt-0.5 truncate max-w-[62px]">
                    {item.label}
                  </span>

                  {item.isHighlight && !isActive && (
                    <span className="absolute top-1.5 right-3 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* PRO Upgrade Modal */}
      <UpgradeProModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        vipCombo={vipComboConfig || undefined}
        initialStep={upgradeInitialStep}
      />
    </div>
  );
};

export default StudentLayout;
