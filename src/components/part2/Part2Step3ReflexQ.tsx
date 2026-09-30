import React, { useState, useEffect, useRef } from 'react';
import { Part2CoachQuestion } from '@/types/part2Coach';
import { Button } from '@/components/ui/button';
import {
  Zap,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Eye,
  Volume2,
  Sparkles,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';

import { soundAudioPlayer } from '@/services/soundAudioPlayer';
import { Part2StepGuide } from './Part2StepGuide';

interface Part2Step3ReflexQProps {
  questions: Part2CoachQuestion[];
  onCompleteStep: () => void;
}

export const Part2Step3ReflexQ: React.FC<Part2Step3ReflexQProps> = ({
  questions,
  onCompleteStep,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [reflexScores, setReflexScores] = useState<Record<number, boolean>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { playSound } = useSound();

  const currentQ = questions[currentIndex];

  useEffect(() => {
    // Reset state on question change
    soundAudioPlayer.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(null);
    setIsRevealed(false);
  }, [currentIndex]);

  const startReflexDrill = async () => {
    setIsRevealed(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(null);

    // Play question audio cleanly using soundAudioPlayer
    await soundAudioPlayer.speakText(currentQ.questionText, 0.95);

    // Immediately start 1.0s countdown right after question finishes
    setCountdown(10); // 1.0 second = 10 tenths
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 100);
  };

  const handleReveal = () => {
    setIsRevealed(true);
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(null);
  };

  const handleSelfGrade = (passed: boolean) => {
    setReflexScores((prev) => ({ ...prev, [currentQ.id]: passed }));
    if (passed) {
      playSound('correct');
    } else {
      playSound('incorrect');
    }
  };

  const passedCount = Object.values(reflexScores).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Sleek Minimal Ribbon */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200/80 dark:border-amber-800/60 px-4 py-2.5 rounded-2xl">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-200 min-w-0">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="font-black text-amber-600 dark:text-amber-400 shrink-0">B3: Phản xạ 1s</span>
          <span className="text-muted-foreground truncate hidden sm:inline">• Nghe dứt câu hỏi ➔ 1s bật ngay nghĩa tiếng Việt</span>
        </div>
        <span className="text-xs font-black text-amber-700 dark:text-amber-300 shrink-0">
          Đạt: {passedCount}/{questions.length} câu
        </span>
      </div>

      {/* Interactive Step Guide */}
      <Part2StepGuide
        stepNumber={3}
        stepTitle="Phản xạ 1s Bật Nghĩa"
        goal="Nghe dứt câu ➔ 1s bật ngay nghĩa ra miệng"
        actions={[
          {
            clickTarget: "1. Bấm 'Bắt đầu phản xạ 1s'",
            expectedResult: "Audio phát câu hỏi, kết thúc sẽ đếm ngược 1s.",
            tip: "Nói to nghĩa ra miệng ngay."
          },
          {
            clickTarget: "2. Bấm 'Lật mở đáp án'",
            expectedResult: "Xem nghĩa tiếng Việt chuẩn và mục tiêu câu hỏi.",
          },
          {
            clickTarget: "3. Tự chấm 'Đạt' hoặc 'Chưa kịp'",
            expectedResult: "Ghi nhận tiến độ phản xạ câu hỏi.",
          }
        ]}
        nextStepName="Bước 4: Phản xạ Hướng Đáp"
      />

      {/* Question Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {questions.map((q, idx) => {
          const isSelected = idx === currentIndex;
          const status = reflexScores[q.id];
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                'px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all shrink-0 flex items-center gap-2 cursor-pointer border',
                isSelected
                  ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
                  : status === true
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : status === false
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50'
              )}
            >
              <span>Câu {q.questionNumber || idx + 1}</span>
              {status === true && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            </button>
          );
        })}
      </div>

      {/* Main Reflex Drill Box */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 space-y-5 shadow-sm text-center">
        {/* Top Trigger Button */}
        <div>
          <Button
            size="lg"
            onClick={startReflexDrill}
            className="btn-3d bg-amber-500 hover:bg-amber-600 text-white font-black text-base px-8 py-5 rounded-2xl shadow-lg shadow-amber-500/20"
          >
            <Play className="w-5 h-5 mr-2" />
            Bắt đầu phản xạ 1s (Câu {currentQ.questionNumber})
          </Button>
        </div>

        {/* 1-Second Countdown Display */}
        <div className="min-h-[100px] flex flex-col items-center justify-center">
          {countdown !== null ? (
            <div className="space-y-2 animate-in fade-in zoom-in-95">
              <div
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center font-black text-xl border-4 transition-all shadow-xl',
                  countdown > 3
                    ? 'border-amber-500 bg-amber-50 text-amber-600 animate-pulse'
                    : 'border-rose-500 bg-rose-50 text-rose-600 scale-110'
                )}
              >
                {(countdown / 10).toFixed(1)}s
              </div>
              <div className="text-xs font-black text-amber-600 dark:text-amber-400 tracking-wide uppercase">
                Bật nghĩa tiếng Việt ngay! 🗣️
              </div>
            </div>
          ) : !isRevealed ? (
            <div className="text-muted-foreground text-xs font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Bấm nút trên để nghe câu hỏi và phản xạ</span>
            </div>
          ) : null}
        </div>

        {/* Reveal Button */}
        {!isRevealed ? (
          <Button
            variant="outline"
            size="default"
            onClick={handleReveal}
            className="rounded-xl border font-bold text-xs px-5 py-2.5 border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            Lật mở đáp án
          </Button>
        ) : (
          /* Revealed Card */
          <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 sm:p-5 space-y-4 text-left animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider">
                  Nghĩa tiếng Việt
                </span>
                <div className="text-lg sm:text-xl font-black text-foreground">
                  {currentQ.reflexDirection1.targetMeaningVi}
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => speakPrompt(currentQ.questionText)}
                className="shrink-0 rounded-xl font-bold text-xs"
              >
                <Volume2 className="w-3.5 h-3.5 mr-1" />
                Nghe lại
              </Button>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-amber-200/80 dark:border-amber-900 text-xs space-y-1">
              <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mục tiêu câu hỏi: {currentQ.reflexDirection1.questionIntent}</span>
              </div>
              <p className="text-muted-foreground italic text-xs">
                {currentQ.reflexDirection1.quickTip}
              </p>
            </div>

            {/* Self Evaluation */}
            <div className="pt-2 border-t border-amber-200/80 dark:border-amber-900 space-y-2">
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  onClick={() => handleSelfGrade(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold py-2.5 text-xs shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  ✓ Kịp 1s (Đạt)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSelfGrade(false)}
                  className="border-slate-300 dark:border-zinc-700 text-rose-600 dark:text-rose-400 rounded-xl font-bold py-2.5 text-xs hover:bg-rose-50"
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  ✗ Chưa kịp
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          {currentIndex > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentIndex((prev) => prev - 1)}
              className="rounded-xl font-bold text-xs"
            >
              ← Trước
            </Button>
          )}

          {currentIndex < questions.length - 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              className="rounded-xl font-bold text-xs"
            >
              Kế tiếp →
            </Button>
          )}
        </div>

        <Button
          size="default"
          onClick={onCompleteStep}
          className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl px-5 py-2.5 text-xs sm:text-sm shadow-md shadow-purple-600/20"
        >
          <span>Tiếp tục: Phản xạ Chiều 2: Bật câu trả lời →</span>
        </Button>
      </div>
    </div>
  );
};
