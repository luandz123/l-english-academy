import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  BookOpen, 
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
  Home
} from "lucide-react";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import GamificationChips from "@/components/GamificationChips";

const navItems = [
  { to: "/library", label: "Kho khóa học", icon: BookOpen, badge: "Bàn học", badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { to: "/fulltests", label: "Luyện đề Full Test", icon: FileCheck2, badge: "Thi thử", badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { to: "/listening", label: "Luyện nghe điền từ", icon: Headphones, badge: "Dictation", badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  { to: "/part2-coach", label: "Phản Xạ Part 2", icon: Zap, badge: "8 Bước", badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { to: "/games", label: "Khu Trò Chơi", icon: Gamepad2, badge: "Arcade", badgeColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" },
  { to: "/profile", label: "Hồ sơ cá nhân", icon: User },
  { to: "/", label: "Về Trang chủ", icon: Home },
];

const mobileNavItems = [
  { to: "/library", label: "Bàn học", icon: BookOpen },
  { to: "/fulltests", label: "Luyện đề", icon: FileCheck2 },
  { to: "/listening", label: "Điền từ", icon: Headphones },
  { to: "/part2-coach", label: "Part 2", icon: Zap, isHighlight: true },
  { to: "/profile", label: "Hồ sơ", icon: User },
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
  const { user, profile, signOut, isAdmin } = useAuth();

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Học viên";
  const initials = displayName.charAt(0).toUpperCase();
  const email = user?.email || "";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const isPart2Active = location.pathname.startsWith("/part2-coach");
  const isFullTestActive = location.pathname === "/fulltests" || location.pathname.includes("/fulltest");
  const isListeningActive = location.pathname === "/listening" || location.pathname.includes("/dictation");
  const isLibraryActive = location.pathname === "/library";

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = `/${pathSegments.slice(0, index + 1).join("/")}`;
    let label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    if (segment === "courses") label = "Khóa học";
    if (segment === "dashboard") label = "Tổng quan";
    if (segment === "profile") label = "Hồ sơ";
    if (segment === "learn") label = "Bài học";
    if (segment === "quiz") label = "Bài tập";
    if (segment === "dictation") label = "Luyện nghe";
    if (segment === "fulltest") label = "Full Test";
    if (segment === "part2-coach") label = "Phản Xạ Part 2";
    if (segment === "fulltests") label = "Luyện đề";
    if (segment === "listening") label = "Luyện nghe";
    if (segment === "library") label = "Kho khóa học";
    return { path, label };
  });

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-200">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop & Drawer Sidebar */}
      <aside
        className={cn(
          "fixed md:sticky top-0 z-50 h-screen bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out shrink-0",
          isCollapsed ? "md:w-[72px]" : "md:w-[260px]",
          sidebarOpen ? "translate-x-0 w-[260px]" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn("h-16 border-b border-border flex items-center justify-between", isCollapsed ? "px-3 justify-center" : "px-5")}>
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
          <div className="p-4 mx-3 my-3 rounded-xl bg-muted/50 border border-border/50 flex items-center gap-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="w-10 h-10 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center border border-primary/20">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          </div>
        ) : (
          <div className="py-4 flex justify-center">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="w-10 h-10 rounded-full object-cover border border-border" title={`${displayName} (${email})`} />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center border border-primary/20" title={`${displayName} (${email})`}>
                {initials}
              </div>
            )}
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = 
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
                onClick={() => setSidebarOpen(false)}
                title={isCollapsed ? `${item.label}${item.badge ? ` (${item.badge})` : ''}` : undefined}
                className={cn(
                  "flex items-center rounded-xl text-sm font-medium transition-all group relative",
                  isCollapsed ? "justify-center p-2.5" : "justify-between px-3.5 py-2.5",
                  active
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <div className={cn("flex items-center min-w-0", isCollapsed ? "justify-center" : "gap-3")}>
                  <item.icon className={cn("w-4 h-4 shrink-0", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!isCollapsed && item.badge && (
                  <span className={cn(
                    "text-xs font-black uppercase px-2 py-0.5 rounded-md border tracking-wider shrink-0",
                    active ? "bg-white/20 text-primary-foreground border-white/30" : item.badgeColor
                  )}>
                    {item.badge}
                  </span>
                )}
                {isCollapsed && item.badge && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              to="/admin/dashboard"
              title={isCollapsed ? "Quản trị Admin" : undefined}
              className={cn(
                "flex items-center rounded-xl text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors mt-2",
                isCollapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5"
              )}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Quản trị Admin</span>}
            </Link>
          )}
        </nav>

        {/* Bottom sign out */}
        <div className="p-3 border-t border-border">
          <button
            onClick={handleSignOut}
            title={isCollapsed ? "Đăng xuất" : undefined}
            className={cn(
              "flex items-center rounded-xl text-sm font-medium text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all w-full text-left",
              isCollapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5"
            )}
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-card/85 backdrop-blur-md border-b border-border flex items-center px-4 md:px-6 justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Logo on mobile for instant brand identity */}
            <div className="md:hidden flex items-center gap-2 shrink-0">
              <Logo imgClassName="w-7 h-7" />
            </div>

            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 text-muted-foreground shrink-0" onClick={() => setSidebarOpen(true)} title="Mở menu">
              <Menu className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-lg mr-1"
              onClick={toggleCollapse}
              title={isCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </Button>
            
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground overflow-hidden">
              <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1" title="Về Trang chủ">
                <Home className="w-3.5 h-3.5" />
                <span>Trang chủ</span>
              </Link>
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={crumb.path}>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                  <Link 
                    to={crumb.path} 
                    className={cn(
                      "truncate max-w-[150px] transition-colors",
                      i === breadcrumbs.length - 1 ? "text-foreground font-semibold" : "hover:text-foreground"
                    )}
                  >
                    {crumb.label}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <GamificationChips />

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-primary/20 transition-all outline-none cursor-pointer">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={displayName} className="w-8 h-8 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center shadow-sm">
                      {initials}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 bg-card shadow-lg rounded-xl border border-border">
                <DropdownMenuLabel className="px-3 py-2">
                  <p className="font-semibold text-sm text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground font-normal truncate mt-0.5">{email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted cursor-pointer">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Hồ sơ cá nhân
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer">
                      <ShieldCheck className="w-4 h-4" />
                      Admin Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer">
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main page content container - padding bottom ensures content isn't covered by mobile bottom nav */}
        <main className="flex-1 p-3.5 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden bg-background pb-24 md:pb-8">{children}</main>

        {/* Mobile Bottom Navigation Bar (Ultra Ergonomic & Modern) */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-xl border-t border-border/80 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom,0px)]">
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
                      ? "text-[var(--duo-blue)] font-black"
                      : "text-muted-foreground hover:text-foreground font-semibold"
                  )}
                >
                  {isActive && (
                    <span className="absolute top-1 w-6 h-1 rounded-full bg-[var(--duo-blue)] shadow-[0_0_8px_var(--duo-blue)] animate-in fade-in zoom-in-50 duration-200" />
                  )}
                  
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                    isActive ? "bg-[var(--duo-blue)]/10 text-[var(--duo-blue)] scale-110" : ""
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
    </div>
  );
};

export default StudentLayout;
