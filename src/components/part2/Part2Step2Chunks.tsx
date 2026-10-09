import React, { useState, useEffect, useCallback } from 'react';
import { Part2CoachQuestion } from '@/types/part2Coach';
import { Button } from '@/components/ui/button';
import {
  Volume2,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';

interface Part2Step2ChunksProps {
  questions: Part2CoachQuestion[];
  onCompleteStep: () => void;
}

const speakChunk = (text: string) => {
  soundAudioPlayer.speakText(text, 0.9);
};

export const Part2Step2Chunks: React.FC<Part2Step2ChunksProps> = ({
  questions,
  onCompleteStep,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stemRepeats, setStemRepeats] = useState<Record<number, number>>({});
  const [vocabRepeats, setVocabRepeats] = useState<Record<string, number>>({});

  const currentQ = questions[currentIndex];

  // Auto-play question stem when changing question
  useEffect(() => {
    if (!currentQ) return;
    const timer = setTimeout(() => {
      speakChunk(currentQ.questionStem.text);
    }, 250);
    return () => clearTimeout(timer);
  }, [currentIndex, currentQ]);

  const handleRepeatStem = () => {
    speakChunk(currentQ.questionStem.text);
    setStemRepeats((prev) => {
      const current = prev[currentQ.id] || 0;
      return { ...prev, [currentQ.id]: Math.min(3, current + 1) };
    });
  };

  const handleRepeatVocab = (term: string) => {
    speakChunk(term);
    const key = `${currentQ.id}-${term}`;
    setVocabRepeats((prev) => {
      const current = prev[key] || 0;
      return { ...prev, [key]: Math.min(3, current + 1) };
    });
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
        speakChunk(currentQ.questionText);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRepeatStem();
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
  }, [handlePrev, handleNext, currentQ]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Sleek Minimal Ribbon */}
      <div className="flex items-center justify-between gap-3 bg-card border border-border/70 px-4 py-2.5 rounded-2xl shadow-soft-xs">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground min-w-0">
          <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse shrink-0" />
          <span className="font-black text-purple-600 dark:text-purple-400">B2: Cụm từ</span>
          <span className="text-muted-foreground text-xs">• Từ để hỏi & từ vựng</span>
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

      {/* Question Context Bar */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-soft-xs">
        <div className="min-w-0">
          <div className="text-sm sm:text-base font-black text-foreground truncate">
            {currentQ.questionText}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {currentQ.questionTranslation}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => speakChunk(currentQ.questionText)}
          className="rounded-xl font-bold text-xs shrink-0 cursor-pointer"
        >
          <Volume2 className="w-3.5 h-3.5 mr-1" />
          Nghe cả câu
        </Button>
      </div>

      {/* 2 Chunks Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Question Stem */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-soft-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <span className="text-xs font-black uppercase text-foreground">
              Từ để hỏi
            </span>
            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 text-[11px] font-bold">
              {currentQ.questionStem.label}
            </span>
          </div>

          <div className="bg-muted/40 rounded-xl p-4 flex items-center justify-between gap-3">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {currentQ.questionStem.text}
            </span>
            <Button
              size="sm"
              onClick={handleRepeatStem}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 mr-1" />
              Nghe
            </Button>
          </div>

          {/* Repeat Counter (1-3) */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((num) => {
              const isPassed = (stemRepeats[currentQ.id] || 0) >= num;
              return (
                <button
                  key={num}
                  onClick={handleRepeatStem}
                  className={cn(
                    'flex-1 py-1.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 cursor-pointer border',
                    isPassed
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-card border-border text-muted-foreground hover:bg-accent'
                  )}
                >
                  {isPassed && <Check className="w-3 h-3 stroke-[3]" />}
                  <span>Lần {num}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card 2: Keywords / Vocab */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-soft-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <span className="text-xs font-black uppercase text-foreground">
              Từ vựng nòng cốt
            </span>
            <span className="text-xs text-muted-foreground font-bold">
              {currentQ.keywordsAndCollocations.length} từ
            </span>
          </div>

          <div className="space-y-2">
            {currentQ.keywordsAndCollocations.map((vocab) => {
              const key = `${currentQ.id}-${vocab.term}`;
              const count = vocabRepeats[key] || 0;

              return (
                <div
                  key={vocab.term}
                  className="bg-muted/40 rounded-xl p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-black text-foreground truncate">{vocab.term}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">{vocab.phonetic}</span>
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-bold truncate">
                      {vocab.meaningVi}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRepeatVocab(vocab.term)}
                    className="rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3 mr-1" />
                    Nghe {count > 0 && `(${count})`}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
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
          {currentIndex === questions.length - 1 ? 'Xong B2' : 'Tiếp'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
