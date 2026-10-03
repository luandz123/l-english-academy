import { trackEvent } from "@/lib/analytics";

export const ZaloContactWidget = () => {
  return (
    <aside aria-label="Kênh hỗ trợ nhanh" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 group">
      {/* Tooltip text: Gọn gàng "Tư vấn Zalo" */}
      <div className="hidden sm:flex items-center gap-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs border border-slate-200 dark:border-zinc-800 py-1.5 px-3 rounded-full shadow-md text-xs font-bold text-slate-700 dark:text-zinc-200 transition-all duration-300 group-hover:translate-x-[-2px]">
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <span>Tư vấn Zalo</span>
      </div>

      {/* Main Floating Button */}
      <a
        href="https://zalo.me/0334729066"
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent("click_zalo", { source: "floating_widget" })}
        aria-label="Liên hệ Zalo tư vấn: 0334 729 066"
        className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.6)] hover:scale-105 active:scale-95 transition-all duration-200"
      >
        {/* Pulse wave ring */}
        <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-35 pointer-events-none" />
        {/* Zalo Icon / Text */}
        <span className="relative z-10 font-black text-base sm:text-lg tracking-tighter select-none drop-shadow-sm">Zalo</span>
      </a>
    </aside>
  );
};

export default ZaloContactWidget;
