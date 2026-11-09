import React, { useEffect, useRef, useState } from "react";
import { Headphones, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const SPEEDS = [0.75, 1, 1.25];

/** Audio câu nghe: nút nghe lại từ đầu và đổi tốc độ (Mistake Notebook §3.7: nghe lại, phát lại từng câu). */
export const AudioBox: React.FC<{ src: string; className?: string; autoPlay?: boolean }> = ({ src, className, autoPlay }) => {
  const ref = useRef<HTMLAudioElement>(null);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = speed;
  }, [speed, src]);

  const replay = () => {
    const a = ref.current;
    if (!a) return;
    a.currentTime = 0;
    void a.play().catch(() => undefined);
  };

  return (
    <div className={cn("rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-2", className)}>
      <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-300">
        <span className="flex items-center gap-1.5">
          <Headphones className="w-4 h-4 text-cyan-400" /> Audio
        </span>
        <div className="flex items-center gap-1.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={cn(
                "min-h-[32px] px-2 rounded-lg border text-[11px] font-bold transition-colors",
                speed === s ? "border-cyan-500 bg-cyan-500/15 text-cyan-300" : "border-slate-800 text-slate-400 hover:text-white",
              )}
            >
              {s}x
            </button>
          ))}
          <button
            type="button"
            onClick={replay}
            className="min-h-[32px] px-2.5 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Nghe lại
          </button>
        </div>
      </div>
      <audio ref={ref} key={src} src={src} controls preload="metadata" autoPlay={autoPlay} className="w-full h-10" />
    </div>
  );
};
