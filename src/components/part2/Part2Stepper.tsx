import React from 'react';
import { Part2StepId } from '@/types/part2Coach';
import { PART2_STEPS_META } from '@/data/part2CoachData';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Part2StepperProps {
  currentStep: Part2StepId;
  completedSteps: Set<Part2StepId>;
  onStepSelect: (stepId: Part2StepId) => void;
  clusterId?: string;
  className?: string;
}

export const Part2Stepper: React.FC<Part2StepperProps> = ({
  currentStep,
  completedSteps,
  onStepSelect,
  className,
}) => {
  const totalSteps = PART2_STEPS_META.length;
  const currentMeta = PART2_STEPS_META.find((s) => s.id === currentStep) || PART2_STEPS_META[0];
  const progressPercent = Math.round((completedSteps.size / totalSteps) * 100);

  return (
    <div className={cn('w-full', className)}>
      {/* Mobile Indicator (< 768px): Chỉ báo số nhỏ + tiến độ mỏng, không ép 7 chữ nhỏ < 11px */}
      <div className="md:hidden flex flex-col gap-1.5 py-1">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-extrabold text-foreground flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#2563EB] text-white text-[10px] font-black">
              {currentStep}
            </span>
            <span>Bước {currentStep}/{totalSteps}: {currentMeta.shortName}</span>
          </span>
          <span className="text-[11px] font-bold text-muted-foreground">
            {completedSteps.size}/{totalSteps} xong ({progressPercent}%)
          </span>
        </div>

        {/* Thin horizontal progress bar */}
        <div className="w-full bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(5, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Desktop Stepper (>= 768px): Capsule Stepper thu gọn (height: 56px), cố định gọn gàng */}
      <div className="hidden md:flex items-center justify-between h-14 bg-card/90 backdrop-blur-md rounded-2xl px-3 border border-border/70 shadow-soft-xs">
        {PART2_STEPS_META.map((step, idx) => {
          const isCurrent = step.id === currentStep;
          const isCompleted = completedSteps.has(step.id);
          const isUpcoming = !isCurrent && !isCompleted;

          return (
            <React.Fragment key={step.id}>
              {/* Step Capsule Button */}
              <button
                type="button"
                onClick={() => onStepSelect(step.id)}
                className={cn(
                  'group flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-150 cursor-pointer select-none text-xs',
                  isCurrent
                    ? 'bg-[#2563EB] text-white shadow-[0_0_14px_rgba(37,99,235,0.45)] font-black scale-[1.02]'
                    : isCompleted
                    ? 'bg-emerald-600 text-white font-bold hover:brightness-105'
                    : 'bg-muted/40 text-[#94A3B8] hover:text-foreground hover:bg-muted font-medium'
                )}
                title={`Bước ${step.id}: ${step.name} - ${step.subtitle}`}
              >
                {/* Circle Badge inside capsule */}
                <span
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-colors',
                    isCurrent
                      ? 'bg-white text-[#2563EB]'
                      : isCompleted
                      ? 'bg-white/20 text-white'
                      : 'bg-muted-foreground/20 text-[#94A3B8]'
                  )}
                >
                  {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : step.id}
                </span>

                {/* Step Short Name */}
                <span className="truncate max-w-[95px] lg:max-w-[125px]">
                  {step.shortName}
                </span>
              </button>

              {/* Connecting Divider between capsules */}
              {idx < totalSteps - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-1.5 rounded-full transition-colors',
                    step.id < currentStep || isCompleted
                      ? 'bg-emerald-500/80'
                      : 'bg-slate-200 dark:bg-zinc-800'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default Part2Stepper;
