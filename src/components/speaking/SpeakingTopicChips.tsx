import React from "react";
import { SPEAKING_TOPICS, SpeakingTopic } from "@/types/speaking";
import { Badge } from "@/components/ui/badge";
import { Check, Hash, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpeakingTopicChipsProps {
  selectedTopics: string[];
  onChangeTopics: (topics: string[]) => void;
  maxSelectable?: number;
  className?: string;
}

export const SpeakingTopicChips: React.FC<SpeakingTopicChipsProps> = ({
  selectedTopics,
  onChangeTopics,
  maxSelectable = 5,
  className,
}) => {
  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      onChangeTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      if (selectedTopics.length >= maxSelectable) {
        // Replace oldest or do nothing
        return;
      }
      onChangeTopics([...selectedTopics, topic]);
    }
  };

  const clearAll = () => {
    onChangeTopics([]);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Hash className="w-4 h-4 text-emerald-500" />
          <span>Chủ đề luyện nói</span>
        </label>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn(
              "text-xs px-2 py-0.5 font-medium transition-colors",
              selectedTopics.length > 0
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300/40"
                : "text-muted-foreground"
            )}
          >
            {selectedTopics.length}/{maxSelectable} đã chọn
          </Badge>
          {selectedTopics.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-rose-500 transition-colors flex items-center gap-0.5"
            >
              <X className="w-3 h-3" />
              <span>Xóa</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
        {SPEAKING_TOPICS.map((topic) => {
          const isSelected = selectedTopics.includes(topic);
          const isAtLimit = selectedTopics.length >= maxSelectable && !isSelected;

          return (
            <button
              key={topic}
              type="button"
              disabled={isAtLimit}
              onClick={() => toggleTopic(topic)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                isSelected
                  ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white border-transparent shadow-sm"
                  : isAtLimit
                  ? "bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-600 border-slate-200/50 dark:border-slate-800 cursor-not-allowed opacity-60"
                  : "bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-border hover:border-slate-300 dark:hover:border-slate-700"
              )}
            >
              {isSelected ? (
                <Check className="w-3 h-3 stroke-[3] text-emerald-400 dark:text-white" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              )}
              <span>{topic}</span>
            </button>
          );
        })}
      </div>
      {selectedTopics.length >= maxSelectable && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          Bạn đã chọn tối đa {maxSelectable} chủ đề. Bỏ bớt để chọn chủ đề khác.
        </p>
      )}
    </div>
  );
};
