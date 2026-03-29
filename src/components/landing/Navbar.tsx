import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b shadow-sm">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-primary">L-English</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Trang chủ</Link>
          <Link to="/courses" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Khóa học</Link>
          <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Về chúng tôi</a>
          <a href="#contact" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Liên hệ</a>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/login">Đăng nhập</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/register">Đăng ký</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
