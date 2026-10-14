import { useQuery } from "@tanstack/react-query";
import { trackEvent } from "@/lib/analytics";
import zaloSvg from "@/assets/icons/zalo-official.svg";
import {
  getHomepageShowcaseConfig,
  DEFAULT_HOMEPAGE_CONFIG,
  HomepageShowcaseConfig,
} from "@/services/homepageShowcaseService";

export const ZaloContactWidget = () => {
  const { data: showcaseConfig = DEFAULT_HOMEPAGE_CONFIG } = useQuery<HomepageShowcaseConfig>({
    queryKey: ["homepage-showcase-config"],
    queryFn: () => getHomepageShowcaseConfig(),
  });

  const contactInfo = showcaseConfig.contact_info || DEFAULT_HOMEPAGE_CONFIG.contact_info;
  const zaloNumber = contactInfo.zalo_number || "0334729066";

  return (
    <aside aria-label="Kênh hỗ trợ nhanh" className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-2 group">
      {/* Tooltip text: Gọn gàng "Tư vấn Zalo" */}
      <div className="hidden sm:flex items-center gap-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs border border-slate-200 dark:border-zinc-800 py-1.5 px-3 rounded-full shadow-md text-xs font-bold text-slate-700 dark:text-zinc-200 transition-all duration-300 group-hover:translate-x-[-2px]">
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
        <span>Tư vấn Zalo 24/7</span>
      </div>

      {/* Main Floating Button */}
      <a
        href={`https://zalo.me/${zaloNumber}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent("click_zalo", { source: "floating_widget" })}
        aria-label={`Liên hệ Zalo tư vấn: ${contactInfo.hotline || zaloNumber}`}
        className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-blue-600 via-sky-500 to-blue-500 text-white flex items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.7)] hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white/30"
      >
        {/* Pulse wave ring */}
        <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-35 pointer-events-none" />
        {/* Zalo Icon */}
        <img src={zaloSvg} alt="Zalo" className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow" />
      </a>
    </aside>
  );
};

export default ZaloContactWidget;
