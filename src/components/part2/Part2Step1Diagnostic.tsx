import React, { useState, useEffect, useCallback } from 'react';
import { Part2CoachQuestion } from '@/types/part2Coach';
import { Button } from '@/components/ui/button';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Headphones
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Part2Step1DiagnosticProps {
  questions: Part2CoachQuestion[];
  onCompleteStep: () => void;
  onSaveDiagnostics?: (data: Record<number, { guess: 'A' | 'B' | 'C'; rating: number }>) => void;
}

export const Part2Step1Diagnostic: React.FC<Part2Step1DiagnosticProps> = ({
  questions,
  onCompleteStep,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

  const currentQ = questions[currentIndex];

  const playAudioSequence = useCallback(() => {
    if (!currentQ) return;
    const aText = currentQ.correctChoice.letter === 'A' ? currentQ.correctChoice.text : currentQ.distractors.find(d => d.letter === 'A')?.text || '';
    const bText = currentQ.correctChoice.letter === 'B' ? currentQ.correctChoice.text : currentQ.distractors.find(d => d.letter === 'B')?.text || '';
    const cText = currentQ.correctChoice.letter === 'C' ? currentQ.correctChoice.text : currentQ.distractors.find(d => d.letter === 'C')?.text || '';

    const items = [
      { text: currentQ.questionText, pauseAfterMs: 800 },
      { text: `(A) ${aText}`, pauseAfterMs: 600 },
      { text: `(B) ${bText}`, pauseAfterMs: 600 },
      { text: `(C) ${cText}`, pauseAfterMs: 400 },
    ];

    soundAudioPlayer.speakSequence(items, {
      rate: 0.95,
      onStepChange: (idx) => {
        setActiveStepIndex(idx);
      },
    });
  }, [currentQ]);

  // Subscribe to audio state
  useEffect(() => {
    const unsubscribe = soundAudioPlayer.subscribe((playing) => {
      setIsPlaying(playing);
      if (!playing) {
        setActiveStepIndex(null);
      }
    });
    return () => {
      unsubscribe();
      soundAudioPlayer.stop();
    };
  }, []);

  // Auto-play when changing question
  useEffect(() => {
    soundAudioPlayer.stop();
    setIsPlaying(false);
    setActiveStepIndex(null);
    const timer = setTimeout(() => {
      playAudioSequence();
    }, 250);
    return () => clearTimeout(timer);
  }, [currentIndex, playAudioSequence]);

  const togglePlayAudio = () => {
    if (isPlaying) {
      soundAudioPlayer.stop();
      setIsPlaying(false);
      setActiveStepIndex(null);
    } else {
      playAudioSequence();
    }
  };

  const handleReplay = () => {
    soundAudioPlayer.stop();
    setIsPlaying(false);
    setActiveStepIndex(null);
    playAudioSequence();
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
        togglePlayAudio();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReplay();
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
  }, [handlePrev, handleNext, isPlaying, playAudioSequence]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Sleek Minimal Ribbon */}
      <div className="flex items-center justify-between gap-3 bg-card border border-border/70 px-4 py-2.5 rounded-2xl shadow-soft-xs">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground min-w-0">
          <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse shrink-0" />
          <span className="font-black text-purple-600 dark:text-purple-400">B1: Nghe thử</span>
          <span className="text-muted-foreground text-xs">• Chỉ nghe quen tai</span>
        </div>
        <span className="text-xs font-black text-muted-foreground">
          Câu {currentIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Question Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {questions.map((q, idx) => {
          const isSelected = idx === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl font-black text-xs transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border',
                isSelected
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent'
              )}
            >
              <span>Câu {q.questionNumber || idx + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Main Diagnostic Card - Clean, no forced quizzes */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-soft-sm text-center">
        {/* Animated Sound Wave Indicator */}
        <div className="flex items-center justify-center gap-1.5 h-12">
          {[40, 70, 100, 60, 30, 85, 45, 95, 60, 35].map((height, i) => (
            <div
              key={i}
              className={cn(
                'w-1.5 rounded-full transition-all duration-300',
                isPlaying
                  ? 'bg-purple-600 dark:bg-purple-400 animate-pulse'
                  : 'bg-muted-foreground/20'
              )}
              style={{
                height: isPlaying ? `${Math.max(12, (height * (activeStepIndex !== null ? 1 : 0.6)))}px` : '8px',
                animationDelay: `${i * 100}ms`
              }}
            />
          ))}
        </div>

        {/* Phase Indicator Chip */}
        <div className="min-h-7 flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 text-xs font-bold border border-purple-500/20">
            <Headphones className="w-3.5 h-3.5" />
            {isPlaying ? (
              activeStepIndex === 0
                ? 'Đang phát: Câu hỏi'
                : activeStepIndex === 1
                ? 'Đang phát: Đáp án (A)'
                : activeStepIndex === 2
                ? 'Đang phát: Đáp án (B)'
                : activeStepIndex === 3
                ? 'Đang phát: Đáp án (C)'
                : 'Đang phát...'
            ) : (
              'Bấm Phát để nghe'
            )}
          </span>
        </div>

        {/* Center Control Buttons - Strictly 1-3 words */}
        <div className="flex items-center justify-center gap-3">
          <Button
            size="lg"
            onClick={togglePlayAudio}
            className={cn(
              'h-12 px-6 rounded-2xl text-white font-bold text-sm shadow-md transition-transform active:scale-95 cursor-pointer',
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-purple-600 hover:bg-purple-700'
            )}
          >
            {isPlaying ? <Pause className="w-4 h-4 mr-1.5" /> : <Play className="w-4 h-4 mr-1.5" />}
            {isPlaying ? 'Dừng' : 'Phát'}
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={handleReplay}
            className="h-12 px-5 rounded-2xl font-bold text-sm border-border cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Nghe lại
          </Button>
        </div>

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
            {currentIndex === questions.length - 1 ? 'Xong B1' : 'Tiếp'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
