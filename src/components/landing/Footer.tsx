import Logo from "@/components/Logo";

// Placeholder links — thay link thật vào đây
const SOCIAL_LINKS = {
  tiktok: "https://www.tiktok.com/@YOUR_TIKTOK",
  youtube: "https://www.youtube.com/@YOUR_YOUTUBE",
  facebook: "https://www.facebook.com/YOUR_FACEBOOK",
};

const Footer = () => {
  return (
    <footer className="bg-[var(--duo-blue-dark)] text-white/80 py-12" id="contact">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Logo showText={true} />
            <p className="text-sm text-white/60 font-medium">Học Tiếng Anh Vui Như Chơi Game! 🎮</p>
            <p className="text-xs text-white/40 font-medium leading-relaxed">
              Nền tảng học Tiếng Anh trực tuyến kết hợp Dictation, Flashcard, Video bài giảng và Đề thi thử Full Test.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-3 pt-1">
              <a
                href={SOCIAL_LINKS.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all hover:scale-110"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.74a4.85 4.85 0 01-1-.05z"/>
                </svg>
              </a>
              <a
                href={SOCIAL_LINKS.youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[var(--duo-orange)] border border-white/10 flex items-center justify-center transition-all hover:scale-110"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[var(--duo-green)] border border-white/10 flex items-center justify-center transition-all hover:scale-110"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Navigation links */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-white">Điều hướng</h4>
            <div className="flex flex-col gap-2 text-sm text-white/60 font-medium">
              <a href="/courses" className="hover:text-[var(--duo-green)] transition-colors">Khóa học</a>
              <a href="/register" className="hover:text-[var(--duo-green)] transition-colors">Đăng ký học</a>
              <a href="/login" className="hover:text-[var(--duo-green)] transition-colors">Đăng nhập</a>
              <a href="#" className="hover:text-[var(--duo-green)] transition-colors">Chính sách bảo mật</a>
              <a href="#" className="hover:text-[var(--duo-green)] transition-colors">Điều khoản sử dụng</a>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-white">Liên hệ</h4>
            <div className="flex flex-col gap-2 text-sm text-white/60 font-medium">
              <p>📱 Zalo: 0334729066</p>
              <p>📧 Email: hotro@l-english.vn</p>
              <div className="pt-2 space-y-1.5">
                <a
                  href={SOCIAL_LINKS.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.74a4.85 4.85 0 01-1-.05z"/>
                  </svg>
                  TikTok: @YOUR_TIKTOK
                </a>
                <a
                  href={SOCIAL_LINKS.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-[var(--duo-orange)] transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  YouTube: @YOUR_YOUTUBE
                </a>
                <a
                  href={SOCIAL_LINKS.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-[var(--duo-green-light)] transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook: YOUR_FACEBOOK
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 text-center text-xs text-white/40 font-medium">
          © 2026 L-English Academy. All rights reserved. Made with 💚
        </div>
      </div>
    </footer>
  );
};

export default Footer;
