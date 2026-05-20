import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[var(--duo-gray)] shadow-[0_1px_0_rgba(47,56,75,0.04)]">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/">
          <Logo />
        </Link>


        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-bold text-foreground hover:text-[var(--duo-green)] transition-colors">Trang chủ</Link>
          <Link to="/courses" className="text-sm font-bold text-muted-foreground hover:text-[var(--duo-green)] transition-colors">Khóa học</Link>
          <a href="#about" className="text-sm font-bold text-muted-foreground hover:text-[var(--duo-green)] transition-colors">Về chúng tôi</a>
          <a href="#contact" className="text-sm font-bold text-muted-foreground hover:text-[var(--duo-green)] transition-colors">Liên hệ</a>
        </div>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-[var(--duo-gray)] hover:border-[var(--duo-green)] transition-colors bg-white shadow-[0_2px_0_var(--duo-gray)] hover:shadow-[0_3px_0_var(--duo-gray)]">
                <div className="w-7 h-7 rounded-full bg-[var(--duo-green)] flex items-center justify-center text-xs font-extrabold text-white shadow-[0_2px_0_var(--duo-green-dark)]">
                  {initials}
                </div>
                <span className="text-sm font-bold text-foreground hidden sm:inline">{displayName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl border-2 border-[var(--duo-gray)] shadow-[0_4px_0_var(--duo-gray)]">
              <DropdownMenuItem onClick={() => navigate("/dashboard")} className="font-bold rounded-lg">
                <User className="w-4 h-4 mr-2 text-[var(--duo-green)]" />
                Dashboard
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate("/admin/dashboard")} className="font-bold rounded-lg">
                  Admin Panel
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-[var(--duo-red)] font-bold rounded-lg">
                <LogOut className="w-4 h-4 mr-2" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-3d btn-3d-white text-sm py-2 px-5">
              Đăng nhập
            </Link>
            <Link to="/register" className="btn-3d btn-3d-green text-sm py-2 px-5">
              Đăng ký
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
