import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { trackEvent } from "@/lib/analytics";
import {
  ArrowRight,
  Flame,
  PhoneCall,
} from "lucide-react";
import heroBannerImg from "@/assets/hero-banner-new.jpg";
import {
  getHomepageShowcaseConfig,
  DEFAULT_HOMEPAGE_CONFIG,
  HomepageShowcaseConfig,
} from "@/services/homepageShowcaseService";

export const HeroCarousel = () => {
  const { data: showcaseConfig = DEFAULT_HOMEPAGE_CONFIG } = useQuery<HomepageShowcaseConfig>({
    queryKey: ["homepage-showcase-config"],
    queryFn: () => getHomepageShowcaseConfig(),
  });

  const contactInfo = showcaseConfig.contact_info || DEFAULT_HOMEPAGE_CONFIG.contact_info;

  return (
    <section className="relative w-full">
      {/* Hidden SEO heading for semantic structure & accessibility */}
      <h1 className="sr-only">
        L-English — Luyện Thi TOEIC — Thi Thử — Game Từ Vựng — Nghe Chép Chính Tả — Luyện Nghe Từng Bước — Luyện Nói 1-1
      </h1>

      {/* ========================================================================= */}
      {/* HERO BANNER CHÍNH THỨC L-ENGLISH                                          */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-[#0c1e3d] via-[#071329] to-[#040914] shadow-[0_10px_50px_rgba(0,0,0,0.8),0_0_35px_rgba(6,182,212,0.18)] group transition-all duration-300">
        {/* Glow Ambient Blobs behind the banner */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Banner Graphic Frame with Responsive 1024:571 Ratio */}
        <div className="relative w-full aspect-[1024/571] overflow-hidden select-none">
          <img
            src={heroBannerImg}
            alt="L-English - Hệ thống luyện thi TOEIC tốt nhất, Thi thử chuẩn ETS, Game từ vựng, Nghe chép chính tả"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.01]"
            loading="eager"
            fetchPriority="high"
          />

          {/* Interactive Clickable Hotspots mapped directly over banner elements */}
          {/* 1. Hotspot: THI THỬ capsule */}
          <a
            href="#section-fulltest"
            onClick={() => trackEvent("hero_click_pill_fulltest", { location: "hero_banner" })}
            title="Đến phòng thi thử chuẩn ETS 120 phút"
            className="absolute left-[5.4%] top-[43.8%] w-[48%] h-[11%] rounded-xl cursor-pointer hover:bg-cyan-400/10 active:bg-cyan-400/20 transition-all duration-200"
            aria-label="Thi thử ETS 120 phút"
          />

          {/* 2. Hotspot: TỪ VỰNG capsule */}
          <Link
            to="/vocab"
            onClick={() => trackEvent("hero_click_pill_vocab", { location: "hero_banner" })}
            title="Học từ vựng phản xạ âm 8 bước & Minigames"
            className="absolute left-[5.4%] top-[56.5%] w-[48%] h-[11%] rounded-xl cursor-pointer hover:bg-cyan-400/10 active:bg-cyan-400/20 transition-all duration-200"
            aria-label="Từ vựng phản xạ & Minigames"
          />

          {/* 3. Hotspot: NGHE NÓI capsule */}
          <a
            href="#section-listening"
            onClick={() => trackEvent("hero_click_pill_listening", { location: "hero_banner" })}
            title="Nghe chép chính tả & Luyện nghe từng bước"
            className="absolute left-[5.4%] top-[69.5%] w-[48%] h-[11%] rounded-xl cursor-pointer hover:bg-cyan-400/10 active:bg-cyan-400/20 transition-all duration-200"
            aria-label="Nghe chép chính tả & Luyện nghe từng bước"
          />

          {/* 4. Hotspot: Nút BẮT ĐẦU THI THỬ NGAY */}
          <a
            href="#section-fulltest"
            onClick={() => trackEvent("hero_click_fulltest", { location: "hero_banner_cta" })}
            title="Bắt đầu thi thử ngay"
            className="absolute left-[5.4%] top-[85.2%] w-[27%] h-[10.5%] rounded-full cursor-pointer hover:ring-2 hover:ring-cyan-300 hover:ring-offset-2 hover:ring-offset-slate-900 active:scale-95 transition-all duration-200 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
            aria-label="Bắt đầu thi thử ngay"
          />

          {/* 5. Hotspot: Nút Xem gói VIP & Lộ trình */}
          <a
            href="#combos"
            onClick={() => trackEvent("hero_click_combos", { location: "hero_banner_cta" })}
            title="Xem gói VIP & Lộ trình"
            className="absolute left-[33%] top-[85.2%] w-[20%] h-[10.5%] rounded-full cursor-pointer hover:bg-white/10 active:scale-95 transition-all duration-200"
            aria-label="Xem gói VIP & Lộ trình"
          />

          {/* 6. Hotspot: QR Code & Hotline */}
          <a
            href={`https://zalo.me/${contactInfo.zalo_number}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("hero_click_hotline", { location: "hero_banner" })}
            title={`Liên hệ Hotline / Zalo: ${contactInfo.hotline}`}
            className="absolute left-[75.2%] top-[78.5%] w-[20%] h-[17%] rounded-2xl cursor-pointer hover:ring-2 hover:ring-cyan-400/60 active:scale-95 transition-all duration-200"
            aria-label={`Hotline tư vấn ${contactInfo.hotline}`}
          />
        </div>
      </div>

      {/* QUICK ACTION BAR DƯỚI BANNER CHO MÀN HÌNH NHỎ (MOBILE THUMB ZONE) */}
      <div className="flex sm:hidden flex-col gap-2.5 pt-3">
        <a
          href="#section-fulltest"
          onClick={() => trackEvent("hero_click_fulltest_mobile", { location: "hero_mobile_cta" })}
          className="w-full py-3.5 px-6 rounded-2xl font-black text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 active:scale-[0.98] shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2"
        >
          <span>Bắt đầu thi thử ngay</span>
          <ArrowRight className="w-4 h-4" />
        </a>

        <div className="grid grid-cols-2 gap-2">
          <a
            href="#combos"
            onClick={() => trackEvent("hero_click_combos_mobile", { location: "hero_mobile_cta" })}
            className="py-3 px-3 rounded-xl font-bold text-xs text-center text-slate-200 bg-white/5 border border-white/10 active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Gói VIP & Lộ trình</span>
          </a>
          <a
            href={`https://zalo.me/${contactInfo.zalo_number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 px-3 rounded-xl font-bold text-xs text-center text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
            <span>Hotline {contactInfo.hotline}</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;

