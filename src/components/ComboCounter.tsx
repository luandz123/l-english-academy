import React from "react";
import { Flame, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComboCounterProps {
  combo: number;
}

export const ComboCounter: React.FC<ComboCounterProps> = ({ combo }) => {
  if (combo < 2) return null;

  const isHighCombo = combo >= 5;

  return (
    <div className="fixed top-20 right-6 z-40 animate-in zoom-in-75 slide-in-from-top-4 duration-300 pointer-events-none">
      <div
        className={cn(
          "px-4 py-2 rounded-2xl border-4 shadow-xl flex items-center gap-2 font-black text-sm sm:text-base animate-bounce",
          isHighCombo
            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-300 shadow-amber-500/50"
            : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-300 shadow-blue-500/40"
        )}
      >
        {isHighCombo ? (
          <Sparkles className="w-5 h-5 fill-amber-200 text-amber-200" />
        ) : (
          <Flame className="w-5 h-5 fill-amber-400 text-amber-400" />
        )}
        <span>
          {isHighCombo ? "PERFECT! " : ""}COMBO x{combo}
        </span>
        <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
      </div>
    </div>
  );
};
