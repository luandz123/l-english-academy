import Logo from "@/components/Logo";

const Footer = () => {
  return (
    <footer className="bg-[#1A1A2E] text-white/80 py-12" id="contact">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <Logo showText={true} />
            <p className="text-sm text-white/60 font-medium">Học Tiếng Anh Vui Như Chơi Game! 🎮</p>
            <p className="text-xs text-white/40 font-medium">Nền tảng học Tiếng Anh trực tuyến với chi phí tối ưu nhất</p>
          </div>
          <div className="space-y-3">
            <h4 className="font-extrabold text-white">Liên kết</h4>
            <div className="flex flex-col gap-2 text-sm text-white/60 font-medium">
              <a href="#" className="hover:text-[var(--duo-green)] transition-colors">Chính sách bảo mật</a>
              <a href="#" className="hover:text-[var(--duo-green)] transition-colors">Điều khoản sử dụng</a>
              <a href="#" className="hover:text-[var(--duo-green)] transition-colors">Liên hệ</a>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-extrabold text-white">Liên hệ</h4>
            <div className="flex flex-col gap-2 text-sm text-white/60 font-medium">
              <p>📱 Zalo: 0334729066</p>
              <p>📧 Email: hotro@l-english.vn</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-6 text-center text-xs text-white/40 font-medium">
          © 2026 L-English. All rights reserved. Made with 💚
        </div>
      </div>
    </footer>
  );
};

export default Footer;
