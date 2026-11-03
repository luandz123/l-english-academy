import heroBannerImg from "@/assets/hero-banner-new.jpg";

/** Cuộn mượt tới một mục trên trang chủ (giữ hash trên URL). */
const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
  const el = document.getElementById(id);
  if (!el) return; // để trình duyệt tự xử lý href
  e.preventDefault();
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.pushState(null, "", `#${id}`);
};

// Vùng bấm trong suốt đặt đúng chỗ các nút được vẽ trong ảnh banner (tính theo % kích thước ảnh)
const HOTSPOT_CLASS =
  "absolute rounded-full outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/80 hover:bg-white/5 transition-colors";

export const HeroCarousel = () => {
  return (
    <section className="relative w-full">
      {/* Hidden SEO heading for semantic structure & accessibility */}
      <h1 className="sr-only">
        L-English — Luyện Thi TOEIC — Thi Thử — Game Từ Vựng — Nghe Chép Chính Tả — Luyện Nghe Từng Bước — Luyện Nói 1-1
      </h1>

      {/* ========================================================================= */}
      {/* HERO BANNER CHÍNH THỨC L-ENGLISH (ẢNH + VÙNG BẤM TRÙNG CÁC NÚT TRONG ẢNH)   */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-[#0c1e3d] via-[#071329] to-[#040914] shadow-[0_10px_50px_rgba(0,0,0,0.8),0_0_35px_rgba(6,182,212,0.18)] select-none">
        {/* Glow Ambient Blobs behind the banner */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Banner Graphic Frame with Responsive 1024:571 Ratio */}
        <div className="relative w-full aspect-[1024/571] overflow-hidden select-none">
          <img
            src={heroBannerImg}
            alt="L-English - Hệ thống luyện thi TOEIC tốt nhất, Thi thử chuẩn ETS, Game từ vựng, Nghe chép chính tả"
            className="w-full h-full object-cover select-none pointer-events-none"
            loading="eager"
            fetchPriority="high"
            draggable={false}
          />
          <a
            href="#section-fulltest"
            onClick={(e) => scrollToSection(e, "section-fulltest")}
            aria-label="Bắt đầu thi thử ngay"
            className={HOTSPOT_CLASS}
            style={{ left: "5.5%", top: "85.5%", width: "26.5%", height: "9.5%" }}
          />
          <a
            href="#section-video"
            onClick={(e) => scrollToSection(e, "section-video")}
            aria-label="Xem khóa học và lộ trình"
            className={HOTSPOT_CLASS}
            style={{ left: "33%", top: "86%", width: "18.5%", height: "8.5%" }}
          />
          <a
            href="https://zalo.me/0334729066"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Nhắn Zalo hotline tư vấn 0334 729 066"
            className={`${HOTSPOT_CLASS} rounded-2xl`}
            style={{ left: "77.5%", top: "85%", width: "19%", height: "11.5%" }}
          />
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;


