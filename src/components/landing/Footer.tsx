import { GraduationCap } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background/80 py-12" id="contact">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-background">L-English</span>
            </div>
            <p className="text-sm text-background/60">Learn Smart. Score High.</p>
            <p className="text-xs text-background/50">Nền tảng luyện thi TOEIC trực tuyến hàng đầu Việt Nam</p>
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold text-background">Liên kết</h4>
            <div className="flex flex-col gap-2 text-sm text-background/60">
              <a href="#" className="hover:text-background transition-colors">Chính sách bảo mật</a>
              <a href="#" className="hover:text-background transition-colors">Điều khoản sử dụng</a>
              <a href="#" className="hover:text-background transition-colors">Liên hệ</a>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold text-background">Liên hệ</h4>
            <div className="flex flex-col gap-2 text-sm text-background/60">
              <p>📧 contact@l-english.vn</p>
              <p>📱 0123 456 789</p>
            </div>
          </div>
        </div>
        <div className="border-t border-background/10 mt-8 pt-6 text-center text-xs text-background/40">
          © 2026 L-English. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
