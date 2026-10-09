import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Part2CoachQuestion } from '@/types/part2Coach';
import { Button } from '@/components/ui/button';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  Volume2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';

interface Part2Step3ReflexQProps {
  questions: Part2CoachQuestion[];
  onCompleteStep: () => void;
}

export const Part2Step3ReflexQ: React.FC<Part2Step3ReflexQProps> = ({
  questions,
  onCompleteStep,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timerSecondsLimit, setTimerSecondsLimit] = useState<number>(4); // Default 4s
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [reflexScores, setReflexScores] = useState<Record<number, boolean>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { playSound } = useSound();

  const currentQ = questions[currentIndex];

  const startReflexDrill = useCallback(async () => {
    setIsRevealed(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(null);

    // Speak question audio
    await soundAudioPlayer.speakText(currentQ.questionText, 0.95);

    // Start countdown
    const initialTenths = timerSecondsLimit * 10;
    setCountdown(initialTenths);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 100);
  }, [currentQ, timerSecondsLimit]);

  // Reset and auto-play when question changes
  useEffect(() => {
    soundAudioPlayer.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(null);
    setIsRevealed(false);

    const timer = setTimeout(() => {
      startReflexDrill();
    }, 250);

    return () => {
      clearTimeout(timer);
      if (timerRef.current) clearInterval(timerRef.current);
      soundAudioPlayer.stop();
    };
  }, [currentIndex, startReflexDrill]);

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

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onCompleteStep();
    }
  }, [currentIndex, questions.length, onCompleteStep]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isRevealed) {
          handleReveal();
        } else {
          startReflexDrill();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        startReflexDrill();
      } else if (e.key === '1' && isRevealed) {
        e.preventDefault();
        handleSelfGrade(true);
      } else if (e.key === '2' && isRevealed) {
        e.preventDefault();
        handleSelfGrade(false);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, isRevealed, startReflexDrill]);

  const totalTenths = timerSecondsLimit * 10;
  const currentTenths = countdown !== null ? countdown : 0;
  const progressPercent = countdown !== null ? (currentTenths / totalTenths) * 100 : 0;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Sleek Ribbon */}
      <div className="flex items-center justify-between gap-3 bg-card border border-border/70 px-4 py-2.5 rounded-2xl shadow-soft-xs">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground min-w-0">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="font-black text-amber-600 dark:text-amber-400">B3: Phản xạ hỏi</span>
          <span className="text-muted-foreground text-xs">• Bật nghĩa tức thì</span>
        </div>

        {/* Timer selector */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl">
          <Clock className="w-3.5 h-3.5 text-muted-foreground ml-1" />
          {[3, 4, 5].map((sec) => (
            <button
              key={sec}
              onClick={() => {
                setTimerSecondsLimit(sec);
                startReflexDrill();
              }}
              className={cn(
                'px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                timerSecondsLimit === sec
                  ? 'bg-card text-foreground shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {sec}s
            </button>
          ))}
        </div>
      </div>

      {/* Question Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {questions.map((q, idx) => {
          const isSelected = idx === currentIndex;
          const score = reflexScores[q.id];
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl font-black text-xs transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border',
                isSelected
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                  : score === true
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : score === false
                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent'
              )}
            >
              <span>Câu {q.questionNumber || idx + 1}</span>
              {score === true && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
              {score === false && <XCircle className="w-3 h-3 text-rose-500" />}
            </button>
          );
        })}
      </div>

      {/* Main Reflex Drill Card */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-soft-sm text-center">
        {/* Countdown & Timer Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span className={cn(
              'text-4xl sm:text-5xl font-black font-mono tracking-tight',
              countdown !== null && countdown <= 10 ? 'text-rose-500 animate-pulse' : 'text-amber-500'
            )}>
              {countdown !== null ? (countdown / 10).toFixed(1) : `${timerSecondsLimit}.0`}s
            </span>
          </div>

          <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-100',
                countdown !== null && countdown <= 10 ? 'bg-rose-500' : 'bg-amber-500'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Revealed Content or Prompt */}
        {!isRevealed ? (
          <div className="py-6 space-y-4">
            <p className="text-base sm:text-lg font-bold text-foreground">
              Tự bật nhanh nghĩa tiếng Việt trong đầu...
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={handleReveal}
                className="h-12 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md cursor-pointer"
              >
                <Eye className="w-4 h-4 mr-1.5" />
                Xem nghĩa
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={startReflexDrill}
                className="h-12 px-5 rounded-2xl font-bold text-sm border-border cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Nghe lại
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="bg-muted/40 border border-border/80 rounded-2xl p-5 space-y-2 text-left">
              <div className="text-sm sm:text-base font-black text-foreground">
                "{currentQ.questionText}"
              </div>
              <div className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">
                👉 {currentQ.reflexDirection1.targetMeaningVi}
              </div>
              <div className="text-xs text-muted-foreground pt-1 border-t border-border/40">
                Ý đồ: {currentQ.reflexDirection1.questionIntent}
              </div>
            </div>

            {/* Self Evaluation Buttons */}
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={() => handleSelfGrade(true)}
                className={cn(
                  'h-11 px-5 rounded-xl font-bold text-xs cursor-pointer',
                  reflexScores[currentQ.id] === true
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/30'
                )}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Đạt
              </Button>

              <Button
                onClick={() => handleSelfGrade(false)}
                className={cn(
                  'h-11 px-5 rounded-xl font-bold text-xs cursor-pointer',
                  reflexScores[currentQ.id] === false
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/30'
                )}
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Chưa đạt
              </Button>

              <Button
                variant="outline"
                onClick={startReflexDrill}
                className="h-11 px-4 rounded-xl font-bold text-xs border-border cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Làm lại
              </Button>
            </div>
          </div>
        )}

        {/* Navigation Row */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="h-9 px-3 rounded-xl font-bold text-xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Trước
          </Button>

          <Button
            onClick={handleNext}
            className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer"
          >
            {currentIndex === questions.length - 1 ? 'Xong B3' : 'Tiếp'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
