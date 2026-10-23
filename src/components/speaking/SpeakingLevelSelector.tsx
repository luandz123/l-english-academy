import React from "react";
import { EnglishLevel, ENGLISH_LEVELS } from "@/types/speaking";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpeakingLevelSelectorProps {
  selectedLevel: EnglishLevel;
  onSelectLevel: (level: EnglishLevel) => void;
  className?: string;
}

export const SpeakingLevelSelector: React.FC<SpeakingLevelSelectorProps> = ({
  selectedLevel,
  onSelectLevel,
  className,
}) => {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span>Trình độ tiếng Anh của bạn</span>
        </label>
        <span className="text-xs text-muted-foreground font-medium">CEFR Standard</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ENGLISH_LEVELS.map(({ level, label, desc }) => {
          const isSelected = selectedLevel === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onSelectLevel(level)}
              className={cn(
                "relative flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                isSelected
                  ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 dark:border-emerald-600 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500"
                  : "bg-card hover:bg-slate-50 dark:hover:bg-slate-900 border-border/80 hover:border-slate-300 dark:hover:border-slate-700"
              )}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span
                  className={cn(
                    "text-sm font-bold tracking-tight px-2 py-0.5 rounded-md",
                    isSelected
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-slate-200"
                  )}
                >
                  {level}
                </span>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center animate-in zoom-in-75">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <p
                className={cn(
                  "text-xs font-medium line-clamp-1",
                  isSelected
                    ? "text-emerald-900 dark:text-emerald-200 font-semibold"
                    : "text-slate-600 dark:text-slate-400"
                )}
              >
                {label.split(" - ")[1]}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
