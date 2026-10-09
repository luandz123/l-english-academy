import { useState, useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { ArrowRight, Sparkles, Flame } from "lucide-react";

export const MobileStickyCta = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Hiện thanh CTA khi người dùng cuộn qua Hero (khoảng 350px)
          setIsVisible(window.scrollY > 350);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Kiểm tra ngay lần đầu

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollToFulltest = (e: React.MouseEvent) => {
    e.preventDefault();
    trackEvent("click_mobile_sticky_cta", { target: "section-fulltest" });
    const target = document.getElementById("section-fulltest");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.hash = "#section-fulltest";
    }
  };

  return (
    <aside
      aria-label="Hành động nhanh trên điện thoại"
      className={`fixed bottom-0 inset-x-0 z-30 lg:hidden px-3.5 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#050914]/92 backdrop-blur-xl border-t border-cyan-500/20 shadow-[0_-10px_35px_rgba(0,0,0,0.85)] transition-all duration-300 ease-out ${
        isVisible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-2 max-w-md mx-auto">
        {/* Nút hành động chính - Chuẩn Fitts's Law & Thumb Zone */}
        <a
          href="#section-fulltest"
          onClick={handleScrollToFulltest}
          className="flex-1 h-12 rounded-xl font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 hover:brightness-110 shadow-[0_0_20px_rgba(6,182,212,0.5)] active:scale-[0.97] transition-all flex items-center justify-center gap-2 select-none"
        >
          <Sparkles className="w-4 h-4 text-slate-950 animate-pulse shrink-0" />
          <span className="font-extrabold tracking-tight">Bắt đầu thi thử ngay</span>
          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-slate-950/20 text-slate-950">
            Free
          </span>
          <ArrowRight className="w-4 h-4 ml-0.5 shrink-0" />
        </a>

        {/* Nút phụ xem VIP gọn gàng */}
        <a
          href="#combos"
          onClick={() => trackEvent("click_mobile_sticky_vip", { target: "combos" })}
          aria-label="Xem gói nâng cấp VIP"
          className="h-12 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-amber-300 flex items-center justify-center shrink-0 active:scale-[0.97] transition-all"
        >
          <Flame className="w-5 h-5 fill-amber-400/20 text-amber-400" />
        </a>
      </div>
    </aside>
  );
};

export default MobileStickyCta;
