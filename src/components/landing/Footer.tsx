import Logo from "@/components/Logo";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background/80 py-12" id="contact">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <Logo showText={true} />
            <p className="text-sm text-background/60">Học Tiếng Anh Giá Rẻ Chất Lượng Cao</p>

            <p className="text-xs text-background/50">Nền tảng học Tiếng Anh trực tuyến với chi phí tối ưu nhất</p>
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
              <p>📱 Zalo: 0334729066</p>
              <p>📧 Email: hotro@l-english.vn</p>
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

