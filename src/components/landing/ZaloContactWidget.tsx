import { MessageCircle, Phone } from "lucide-react";

export const ZaloContactWidget = () => {
  return (
    <aside aria-label="Kênh hỗ trợ nhanh" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 group">
      {/* Tooltip text */}
      <div className="hidden sm:flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 py-1.5 px-3 rounded-full shadow-lg text-xs font-bold text-slate-700 dark:text-zinc-200 transition-all duration-300 group-hover:translate-x-[-4px]">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span>Tư vấn qua Zalo 24/7</span>
      </div>

      {/* Main Floating Button */}
      <a
        href="https://zalo.me/0334729066"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Liên hệ Zalo tư vấn: 0334 729 066"
        className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xl shadow-blue-600/30 hover:scale-110 active:scale-95 transition-all duration-200"
      >
        {/* Pulsing ring */}
        <span className="absolute inset-0 rounded-full bg-blue-500/40 animate-ping -z-10" />

        {/* Zalo Icon / Text */}
        <span className="font-black text-lg tracking-tighter">Zalo</span>
      </a>
    </aside>
  );
};

export default ZaloContactWidget;
