import React from "react";

/** Dải hướng dẫn ở đầu mỗi bước. */
export const StepRibbon: React.FC<{ howTo: string; right?: React.ReactNode }> = ({ howTo, right }) => (
  <div className="flex items-center justify-between gap-3 bg-card border border-border/70 px-4 py-2.5 rounded-2xl shadow-soft-xs">
    <div className="flex items-center gap-2 min-w-0">
      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
      <span className="text-xs sm:text-sm text-muted-foreground font-medium leading-snug">{howTo}</span>
    </div>
    {right && <span className="text-xs font-black text-muted-foreground shrink-0">{right}</span>}
  </div>
);
