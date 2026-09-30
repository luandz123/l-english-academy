import React from "react";
import { Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGamification } from "@/hooks/useGamification";

interface GamificationChipsProps {
  className?: string;
  compact?: boolean;
}

export const GamificationChips: React.FC<GamificationChipsProps> = ({ className, compact = false }) => {
  const { streak, xp, levelInfo } = useGamification();

  return (
    <div className={cn("flex items-center gap-1.5 sm:gap-2 shrink-0", className)}>
      {/* Streak Badge */}
      <div
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-black shadow-2xs cursor-default"
        title="Ngọn lửa Chuỗi ngày học tập của bạn"
      >
        <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-pulse" />
        <span className="text-xs">{streak} <span className={compact ? "hidden" : "hidden xs:inline"}>Ngày</span></span>
      </div>

      {/* XP & Level Badge */}
      <div
        className={cn("flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs font-black shadow-2xs", levelInfo.color)}
        title={`${levelInfo.title} - Còn ${levelInfo.xpToNextLevel} XP để lên Cấp tiếp theo`}
      >
        <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
        <span className="text-xs">Lv.{levelInfo.level} <span className={compact ? "hidden" : "hidden sm:inline"}>• {xp} XP</span></span>
      </div>
    </div>
  );
};

export default GamificationChips;
