import React, { useRef } from 'react';
import { Part2StepId } from '@/types/part2Coach';
import { PART2_STEPS_META } from '@/data/part2CoachData';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface Part2StepperProps {
  currentStep: Part2StepId;
  completedSteps: Set<Part2StepId>;
  onStepSelect: (stepId: Part2StepId) => void;
  clusterId?: string;
}

export const Part2Stepper: React.FC<Part2StepperProps> = ({
  currentStep,
  completedSteps,
  onStepSelect,
  clusterId,
}) => {
  const { toast } = useToast();
  const skippedClustersRef = useRef<Set<string>>(new Set());

  const totalSteps = PART2_STEPS_META.length;
  const currentMeta = PART2_STEPS_META.find((s) => s.id === currentStep) || PART2_STEPS_META[0];

  // Lowest step id not yet completed
  const suggestedStep = PART2_STEPS_META.find((s) => !completedSteps.has(s.id))?.id;

  const handleStepClick = (stepId: Part2StepId) => {
    if (suggestedStep && stepId > suggestedStep) {
      const clusterKey = clusterId || 'default';
      if (!skippedClustersRef.current.has(clusterKey)) {
        skippedClustersRef.current.add(clusterKey);
        const suggestedMeta = PART2_STEPS_META.find((s) => s.id === suggestedStep);
        toast({
          description: `Bạn có thể quay lại bước ${suggestedMeta?.name || `Bước ${suggestedStep}`} bất cứ lúc nào.`,
        });
      }
    }
    onStepSelect(stepId);
  };

  const progressPercent = Math.round((completedSteps.size / totalSteps) * 100);

  return (
    <div className="w-full space-y-2">
      {/* Mobile Step Info Banner: only shown on mobile */}
      <div className="md:hidden flex items-center justify-between text-xs px-1">
        <span className="font-bold text-foreground truncate">
          Bước {currentStep}: {currentMeta.name}
        </span>
        {currentStep === suggestedStep && (
          <span className="text-xs text-purple-600 dark:text-purple-400 font-bold shrink-0 ml-2">
            (Gợi ý tiếp theo)
          </span>
        )}
      </div>

      {/* Stepper Steps Row */}
      <div className="flex items-start justify-between w-full">
        {PART2_STEPS_META.map((step, idx) => {
          const isCurrent = step.id === currentStep;
          const isCompleted = completedSteps.has(step.id);
          const isSuggested = !isCompleted && step.id === suggestedStep;

          let stateDescription = '';
          if (isCurrent) stateDescription = ' (Đang ở bước này)';
          else if (isCompleted) stateDescription = ' (Đã hoàn thành)';
          else if (isSuggested) stateDescription = ' (Gợi ý làm tiếp)';

          return (
            <div key={step.id} className="flex-1 flex flex-col items-center relative min-w-0">
              {/* Connecting line to next step */}
              {idx < totalSteps - 1 && (
                <div
                  className={cn(
                    'absolute top-3.5 sm:top-4 left-1/2 w-full h-0.5 -z-0 pointer-events-none transition-colors',
                    step.id < currentStep || isCompleted
                      ? 'bg-purple-600 dark:bg-purple-500'
                      : 'bg-slate-200 dark:bg-zinc-800'
                  )}
                />
              )}

              {/* Step Circle Button */}
              <button
                type="button"
                onClick={() => handleStepClick(step.id)}
                aria-label={`Bước ${step.id}: ${step.name}${stateDescription}`}
                title={`Bước ${step.id}: ${step.name} - ${step.subtitle}`}
                className={cn(
                  'relative z-10 cursor-pointer transition-all duration-200 flex items-center justify-center shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs',
                  isCurrent
                    ? 'bg-purple-600 text-white ring-4 ring-purple-600/30 shadow-md font-black scale-105'
                    : isCompleted
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 font-bold shadow-xs'
                    : isSuggested
                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 ring-2 ring-purple-400 dark:ring-purple-600 font-bold hover:bg-purple-100 dark:hover:bg-purple-900/60'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 font-medium'
                )}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                ) : (
                  <span>{step.id}</span>
                )}
              </button>

              {/* Step Name on Desktop (Up to 2 lines, not cut off) */}
              <div className="hidden md:block w-full text-center mt-1.5 px-0.5">
                <span
                  className={cn(
                    'text-xs line-clamp-2 leading-snug transition-colors break-words',
                    isCurrent
                      ? 'font-black text-purple-700 dark:text-purple-300'
                      : isCompleted
                      ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                      : isSuggested
                      ? 'font-bold text-purple-600 dark:text-purple-400'
                      : 'font-medium text-slate-500 dark:text-zinc-400'
                  )}
                  title={step.name}
                >
                  {step.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar & Subtext */}
      <div className="w-full space-y-1 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Đã hoàn thành {completedSteps.size}/{totalSteps} bước</span>
          <span className="font-bold">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800" />
      </div>
    </div>
  );
};
