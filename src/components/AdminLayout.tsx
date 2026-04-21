import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, BookOpen, Users, ClipboardList, FileText, BarChart3, Settings, LogOut, Menu, X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";


const navItems = [
  { to: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { to: "/admin/courses", label: "Khóa học", icon: BookOpen },
  { to: "/admin/students", label: "Học viên", icon: Users },
  { to: "/admin/enrollments", label: "Đăng ký", icon: ClipboardList },
  { to: "/admin/materials", label: "Tài liệu", icon: FileText },
  { to: "/admin/reports", label: "Báo cáo", icon: BarChart3 },
  { to: "/admin/settings", label: "Cài đặt", icon: Settings },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={cn(
        "fixed lg:static z-50 inset-y-0 left-0 w-60 flex flex-col transition-transform duration-300",
        "bg-[hsl(255,61%,15%)] text-[hsl(226,100%,90%)]",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-4 flex items-center gap-2">
          <Logo imgClassName="w-8 h-8" showText={false} />
          <div>
            <span className="font-bold text-sm text-white">L-English</span>
            <p className="text-[10px] text-[hsl(226,100%,80%)]">Admin Panel</p>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto lg:hidden text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>


        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-[hsl(239,84%,67%)] text-white border-l-4 border-[hsl(160,84%,39%)]"
                    : "text-[hsl(226,100%,80%)] hover:bg-[hsl(255,40%,25%)] hover:text-white"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[hsl(255,40%,25%)] space-y-1">
          <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[hsl(226,100%,80%)] hover:bg-[hsl(255,40%,25%)] hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
            ← Về trang học
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[hsl(226,100%,80%)] hover:bg-[hsl(255,40%,25%)] hover:text-white transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-14 bg-card/95 backdrop-blur-sm border-b flex items-center px-4 gap-4 shadow-sm">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon"><Bell className="w-4 h-4" /></Button>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {profile?.full_name?.charAt(0)?.toUpperCase() || "A"}
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
