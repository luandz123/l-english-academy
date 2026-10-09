import React, { useState, useEffect, useCallback } from 'react';
import { Part2CoachQuestion } from '@/types/part2Coach';
import { Button } from '@/components/ui/button';
import {
  Volume2,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';

interface Part2Step4ReflexAProps {
  questions: Part2CoachQuestion[];
  onCompleteStep: () => void;
}

const speakText = (text: string) => {
  soundAudioPlayer.speakText(text, 0.95);
};

export const Part2Step4ReflexA: React.FC<Part2Step4ReflexAProps> = ({
  questions,
  onCompleteStep,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [viewedQuestions, setViewedQuestions] = useState<Record<number, boolean>>({});

  const currentQ = questions[currentIndex];

  // Auto-play question audio when changing question
  useEffect(() => {
    setShowAnswer(false);
    if (!currentQ) return;
    const timer = setTimeout(() => {
      speakText(currentQ.questionText);
    }, 250);
    return () => clearTimeout(timer);
  }, [currentIndex, currentQ]);

  const handleShowAnswer = () => {
    setShowAnswer(true);
    setViewedQuestions((prev) => ({ ...prev, [currentQ.id]: true }));
    speakText(currentQ.correctChoice.text);
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
        if (!showAnswer) {
          handleShowAnswer();
        } else {
          speakText(currentQ.correctChoice.text);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        speakText(currentQ.questionText);
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
  }, [handlePrev, handleNext, showAnswer, currentQ]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Sleek Minimal Ribbon */}
      <div className="flex items-center justify-between gap-3 bg-card border border-border/70 px-4 py-2.5 rounded-2xl shadow-soft-xs">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground min-w-0">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse shrink-0" />
          <span className="font-black text-teal-600 dark:text-teal-400">B4: Phản xạ đáp</span>
          <span className="text-muted-foreground text-xs">• Tự phản xạ câu trả lời</span>
        </div>
        <span className="text-xs font-black text-muted-foreground">
          Câu {currentIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Question Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {questions.map((q, idx) => {
          const isSelected = idx === currentIndex;
          const isDone = viewedQuestions[q.id];
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl font-black text-xs transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border',
                isSelected
                  ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20'
                  : isDone
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent'
              )}
            >
              <span>Câu {q.questionNumber || idx + 1}</span>
              {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            </button>
          );
        })}
      </div>

      {/* Main Reflex Answer Card */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-soft-sm text-center">
        {/* Question Header */}
        <div className="bg-muted/40 border border-border/80 rounded-2xl p-5 space-y-2 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-teal-600 dark:text-teal-400">
              Câu hỏi:
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => speakText(currentQ.questionText)}
              className="rounded-xl text-xs font-bold shrink-0 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 mr-1" />
              Nghe hỏi
            </Button>
          </div>
          <div className="text-base sm:text-lg font-black text-foreground">
            {currentQ.questionText}
          </div>
          <div className="text-xs text-muted-foreground">
            {currentQ.questionTranslation}
          </div>
        </div>

        {/* Reflex Prompt or Answer */}
        {!showAnswer ? (
          <div className="py-6 space-y-4">
            <p className="text-sm sm:text-base font-bold text-muted-foreground">
              Tự bật câu trả lời trong đầu hoặc nói to...
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={handleShowAnswer}
                className="h-12 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md cursor-pointer"
              >
                <Eye className="w-4 h-4 mr-1.5" />
                Đáp án
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => speakText(currentQ.questionText)}
                className="h-12 px-5 rounded-2xl font-bold text-sm border-border cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Nghe lại
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-200 text-left">
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-teal-700 dark:text-teal-300">
                  Đáp án chuẩn ({currentQ.correctChoice.letter})
                </span>
                <Button
                  size="sm"
                  onClick={() => speakText(currentQ.correctChoice.text)}
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 mr-1" />
                  Nghe đáp
                </Button>
              </div>

              <div className="text-base sm:text-lg font-black text-foreground">
                "{currentQ.correctChoice.text}"
              </div>
              <div className="text-xs sm:text-sm text-teal-700 dark:text-teal-300 font-medium">
                {currentQ.correctChoice.translation}
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  speakText(currentQ.questionText);
                  setTimeout(() => speakText(currentQ.correctChoice.text), 1500);
                }}
                className="rounded-xl text-xs font-bold cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 mr-1" />
                Nghe cả cặp
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
            {currentIndex === questions.length - 1 ? 'Xong B4' : 'Tiếp'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
