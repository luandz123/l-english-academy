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
  Zap 
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
import { useGamification } from "@/hooks/useGamification";

const navItems = [
  { to: "/#section-fulltest", label: "Luyện đề Full Test", icon: FileCheck2, badge: "Thi thử", badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { to: "/#section-listening", label: "Luyện nghe điền từ", icon: Headphones, badge: "Dictation", badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  { to: "/#section-video", label: "Kho khóa học", icon: BookOpen },
  { to: "/profile", label: "Hồ sơ cá nhân", icon: User },
];

const mobileNavItems = [
  { to: "/#section-fulltest", label: "Luyện đề", icon: FileCheck2, isHighlight: true },
  { to: "/#section-listening", label: "Điền từ", icon: Headphones, isHighlight: true },
  { to: "/#section-video", label: "Khóa học", icon: BookOpen },
  { to: "/profile", label: "Hồ sơ", icon: User },
];

const StudentLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, isAdmin } = useAuth();
  const { streak, xp, levelInfo } = useGamification();

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Học viên";
  const initials = displayName.charAt(0).toUpperCase();
  const email = user?.email || "";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const isFullTestActive = location.pathname.includes("/fulltest");
  const isListeningActive = location.pathname.includes("/dictation");
  const isAllCoursesActive = (location.pathname === "/" || location.pathname === "/courses") && !isFullTestActive && !isListeningActive;

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
          "fixed md:sticky top-0 z-50 h-screen w-[260px] bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-16 px-5 border-b border-border flex items-center justify-between">
          <Logo imgClassName="w-8 h-8" />
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 text-muted-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* User preview */}
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

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = 
              item.to.includes("fulltest")
                ? isFullTestActive
                : item.to.includes("listening")
                ? isListeningActive
                : item.to.includes("video") || item.to === "/courses"
                ? isAllCoursesActive
                : location.pathname === item.to;

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group",
                  active
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <item.icon className={cn("w-4 h-4 shrink-0", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider shrink-0",
                    active ? "bg-white/20 text-primary-foreground border-white/30" : item.badgeColor
                  )}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors mt-2"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              Quản trị Admin
            </Link>
          )}
        </nav>

        {/* Bottom sign out */}
        <div className="p-3 border-t border-border">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all w-full text-left"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
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
            
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground overflow-hidden">
              <Link to="/profile" className="hover:text-foreground transition-colors" title="Hồ sơ cá nhân">
                <User className="w-3.5 h-3.5" />
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
            {/* Streak Badge */}
            <div 
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-black shadow-2xs cursor-default"
              title="Ngọn lửa Chuỗi ngày học tập của bạn"
            >
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-pulse" />
              <span className="text-[11px] sm:text-xs">{streak} <span className="hidden xs:inline">Ngày</span></span>
            </div>

            {/* XP & Level Badge */}
            <div 
              className={cn("flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs font-black shadow-2xs", levelInfo.color)}
              title={`${levelInfo.title} - Còn ${levelInfo.xpToNextLevel} XP để lên Cấp tiếp theo`}
            >
              <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
              <span className="text-[11px] sm:text-xs">Lv.{levelInfo.level} <span className="hidden sm:inline">• {xp} XP</span></span>
            </div>

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
                item.to.includes("fulltest")
                  ? isFullTestActive
                  : item.to.includes("listening")
                  ? isListeningActive
                  : item.to.includes("video") || item.to === "/courses"
                  ? isAllCoursesActive
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
                  
                  <span className="text-[10px] tracking-tight leading-tight mt-0.5 truncate max-w-[62px]">
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
