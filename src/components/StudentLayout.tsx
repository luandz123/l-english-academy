import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, BookOpen, User, LogOut, Menu, X, ChevronRight, Flame, ShieldAlert, KeyRound } from "lucide-react";
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

const navItems = [
  { to: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, color: "text-[var(--duo-green)]" },
  { to: "/courses", label: "Khóa học", icon: BookOpen, color: "text-[var(--duo-blue)]" },
  { to: "/profile", label: "Hồ sơ", icon: User, color: "text-[var(--duo-purple)]" },
];

const StudentLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, isAdmin } = useAuth();

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const initials = displayName.charAt(0).toUpperCase();
  const email = user?.email || "";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = `/${pathSegments.slice(0, index + 1).join("/")}`;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    return { path, label };
  });

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-foreground/20 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={cn(
        "fixed md:static z-50 inset-y-0 left-0 w-[260px] bg-card border-r-2 border-[var(--duo-gray)] flex flex-col transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Logo + close */}
        <div className="p-4 border-b-2 border-[var(--duo-gray)] flex items-center gap-2">
          <Logo imgClassName="w-8 h-8" />
          <Button variant="ghost" size="icon" className="ml-auto md:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* User profile card */}
        <div className="p-4 border-b-2 border-[var(--duo-gray)]">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="w-12 h-12 rounded-full object-cover border-2 border-[var(--duo-green)]" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[var(--duo-green)] flex items-center justify-center text-white font-extrabold text-lg shadow-[0_3px_0_var(--duo-green-dark)] border-2 border-white">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-foreground truncate">{displayName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Flame className="w-3.5 h-3.5 text-[var(--duo-orange)]" />
                <span className="text-xs font-bold text-[var(--duo-orange)]">Đang học</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group",
                  active
                    ? "bg-[var(--duo-green)] text-white shadow-[0_3px_0_var(--duo-green-dark)]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground border-2 border-transparent hover:border-[var(--duo-gray)]"
                )}
              >
                <item.icon className={cn("w-5 h-5", active ? "text-white" : item.color, "group-hover:scale-110 transition-transform")} />
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-2 border-transparent hover:border-[var(--duo-gray)]"
            >
              <LayoutDashboard className="w-5 h-5 text-[var(--duo-orange)]" />
              Admin Panel
            </Link>
          )}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t-2 border-[var(--duo-gray)] space-y-1">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:bg-red-50 hover:text-[var(--duo-red)] transition-all w-full border-2 border-transparent hover:border-red-200"
          >
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-card/95 backdrop-blur-md border-b-2 border-[var(--duo-gray)] flex items-center px-4 gap-4 justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            
            <div className="hidden sm:flex items-center gap-2 overflow-hidden">
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                <LayoutDashboard className="w-4 h-4" />
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
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1.5 bg-[#FFF8E0] px-3 py-1.5 rounded-full border-2 border-[#FFE680]">
              <Flame className="w-4 h-4 text-[var(--duo-orange)]" />
              <span className="text-xs font-extrabold text-[#B38600]">L-English</span>
            </div>

            {/* D5: Dropdown header user avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-full hover:bg-muted transition-colors outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--duo-blue)]">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={displayName} className="w-8 h-8 rounded-full object-cover border-2 border-[var(--duo-blue)]" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--duo-blue)] flex items-center justify-center text-white font-extrabold text-xs shadow-[0_2px_0_var(--duo-blue-dark)]">
                      {initials}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 card-duo p-1 space-y-0.5 mt-1 border-2 border-[var(--duo-gray)] bg-card shadow-lg rounded-2xl">
                <DropdownMenuLabel className="font-extrabold text-sm px-3 py-2 text-foreground">
                  <p className="truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground font-semibold truncate mt-0.5">{email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[var(--duo-gray)] my-1" />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors">
                    <User className="w-4 h-4 text-[var(--duo-purple)]" />
                    Hồ sơ cá nhân
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator className="bg-[var(--duo-gray)] my-1" />
                    <DropdownMenuItem asChild>
                      <Link to="/admin/dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-bold text-[var(--duo-orange)] hover:bg-[var(--duo-orange)]/5 cursor-pointer transition-colors">
                        <ShieldAlert className="w-4 h-4 text-[var(--duo-orange)]" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="bg-[var(--duo-gray)] my-1" />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-bold text-[var(--duo-red)] hover:bg-red-50 cursor-pointer transition-colors">
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden bg-background">{children}</main>
      </div>
    </div>
  );
};

export default StudentLayout;
