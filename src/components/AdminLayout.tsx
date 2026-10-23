import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, BookOpen, Users, ClipboardList, FileText, BarChart3, Settings, LogOut, Menu, X, Sun, Moon, ChevronRight, ShieldAlert, Home, FileJson, Gamepad2, Database, CreditCard } from "lucide-react";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { to: "/admin/games", label: "Cấu hình Trò chơi", icon: Gamepad2 },
  { to: "/admin/vocab-packs", label: "Bộ từ vựng Game", icon: BookOpen },
  { to: "/admin/categories", label: "Danh mục", icon: BookOpen },
  { to: "/admin/courses", label: "Khóa học", icon: BookOpen },
  { to: "/admin/fulltests", label: "Full Test TOEIC", icon: ClipboardList },
  { to: "/admin/import-json", label: "Import Part JSON", icon: FileJson },
  { to: "/admin/students", label: "Học viên", icon: Users },
  { to: "/admin/enrollments", label: "Đăng ký & Đơn hàng", icon: ClipboardList },
  { to: "/admin/settings?tab=payment", label: "Cổng Thanh Toán SePay", icon: CreditCard },
  { to: "/admin/materials", label: "Tài liệu", icon: FileText },
  { to: "/admin/reports", label: "Báo cáo", icon: BarChart3 },
  { to: "/admin/backup", label: "Sao lưu Dữ liệu", icon: Database },
  { to: "/admin/settings", label: "Cài đặt", icon: Settings },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Admin";
  const initials = displayName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggleDarkMode = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = `/${pathSegments.slice(0, index + 1).join("/")}`;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    return { path, label };
  });

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={cn(
        "fixed lg:static z-50 inset-y-0 left-0 w-[260px] bg-card border-r border-border/70 shadow-soft-sm flex flex-col transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo + close */}
        <div className="p-4 border-b border-border/50 flex items-center gap-2">
          <Logo imgClassName="w-8 h-8" />
          <div className="hidden lg:block ml-2">
             <span className="font-extrabold text-sm text-primary block">L-English</span>
             <span className="font-bold text-xs text-muted-foreground tracking-wider uppercase">Quản trị</span>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* User profile card */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-white font-extrabold text-base shadow-soft-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldAlert className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">Quản trị viên</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const hasQuery = item.to.includes("?");
            const [basePath, searchPart] = hasQuery ? item.to.split("?") : [item.to, ""];
            const active = hasQuery
              ? location.pathname === basePath && location.search.includes(searchPart)
              : item.to === "/admin/settings"
              ? location.pathname === "/admin/settings" && !location.search.includes("tab=payment")
              : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group active:scale-95 duration-150",
                  active
                    ? "bg-primary text-primary-foreground font-bold shadow-soft-sm"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-border/50 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all active:scale-95 w-full"
          >
            <Home className="w-4 h-4 text-primary" />
            <span>Về trang chủ</span>
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all active:scale-95 w-full"
          >
            <LayoutDashboard className="w-4 h-4 text-primary" />
            <span>Hồ sơ học tập</span>
          </Link>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleDarkMode}
            className="w-full justify-start gap-2.5 px-3 py-2 h-auto text-xs text-muted-foreground hover:text-foreground font-semibold rounded-xl"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-primary" />}
            <span>{isDark ? "Giao diện sáng" : "Giao diện tối"}</span>
          </Button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all active:scale-95 w-full"
          >
            <LogOut className="w-4 h-4 text-destructive" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-card/95 backdrop-blur-md border-b border-border/70 shadow-soft-xs flex items-center px-4 gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="hidden sm:flex items-center gap-2 overflow-hidden">
            <Link to="/admin/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ShieldAlert className="w-4 h-4" />
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.path}>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <Link 
                  to={crumb.path} 
                  className={cn(
                    "text-xs font-bold truncate max-w-[120px] transition-colors",
                    i === breadcrumbs.length - 1 ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {crumb.label}
                </Link>
              </React.Fragment>
            ))}
          </div>
          
          <div className="ml-auto flex items-center gap-3">
            <Link
              to="/"
              className="btn-3d btn-3d-white text-xs sm:text-sm py-2 px-4 inline-flex items-center gap-1.5 font-bold rounded-xl shadow-soft-xs active:scale-95"
            >
              <Home className="w-4 h-4 text-primary" />
              Trang chủ
            </Link>
            <div className="hidden md:flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
              <ShieldAlert className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary">Admin Mode</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;

