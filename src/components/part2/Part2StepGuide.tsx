import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepActionItem {
  icon?: React.ReactNode;
  clickTarget: string;
  expectedResult: string;
  tip?: string;
}

interface Part2StepGuideProps {
  stepNumber: number;
  stepTitle: string;
  goal: string;
  actions: StepActionItem[];
  nextStepName?: string;
  defaultOpen?: boolean;
}

export const Part2StepGuide: React.FC<Part2StepGuideProps> = ({
  stepNumber,
  actions,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Short 1-line summary flow
  const summaryFlow = actions
    .map((a, i) => `${i + 1}. ${a.clickTarget.replace(/^(Bấm vào nút |Bấm nút |Bấm chọn |Bấm |Xem )/i, '')}`)
    .join(' ➔ ');

  return (
    <div className="bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 rounded-xl px-3 py-1.5 transition-all">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center font-black text-xs shrink-0">
            {stepNumber}
          </span>
          <span className="font-bold text-purple-900 dark:text-purple-200 truncate text-xs">
            {summaryFlow}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 flex items-center gap-0.5 shrink-0 cursor-pointer ml-2"
        >
          <span>{isOpen ? 'Thu gọn' : 'Chi tiết'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-2 pt-2 border-t border-purple-200/50 dark:border-purple-800/40 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs animate-in fade-in duration-150">
          {actions.map((act, idx) => (
            <div
              key={idx}
              className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-purple-100 dark:border-zinc-800 text-xs"
            >
              <div className="font-bold text-purple-700 dark:text-purple-300">
                {idx + 1}. {act.clickTarget}
              </div>
              <div className="text-muted-foreground mt-0.5">
                {act.expectedResult}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
