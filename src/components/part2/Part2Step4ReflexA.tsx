import React, { useState } from 'react';
import { Part2CoachQuestion } from '@/types/part2Coach';
import { Button } from '@/components/ui/button';
import {
  MessageSquareShare,
  Compass,
  Volume2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  RotateCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { soundAudioPlayer } from '@/services/soundAudioPlayer';
import { Part2StepGuide } from './Part2StepGuide';

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
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  const currentQ = questions[currentIndex];

  const toggleFlip = (cardKey: string, textToSpeak?: string) => {
    const isNowFlipped = !flippedCards[cardKey];
    setFlippedCards((prev) => ({ ...prev, [cardKey]: isNowFlipped }));
    if (isNowFlipped && textToSpeak) {
      speakText(textToSpeak);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sleek Minimal Ribbon */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 dark:from-teal-950/40 dark:to-cyan-950/40 border border-teal-200/80 dark:border-teal-800/60 px-4 py-2.5 rounded-2xl">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-teal-800 dark:text-teal-200 min-w-0">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse shrink-0" />
          <span className="font-black text-teal-600 dark:text-teal-400 shrink-0">B4: Hướng đáp & Câu né</span>
          <span className="text-muted-foreground truncate hidden sm:inline">• Dự đoán phản xạ đáp & câu trả lời gián tiếp</span>
        </div>
        <span className="text-xs font-bold text-muted-foreground shrink-0">Câu {currentIndex + 1}/{questions.length}</span>
      </div>

      {/* Interactive Step Guide */}
      <Part2StepGuide
        stepNumber={4}
        stepTitle="Đoán Hướng Đáp"
        goal="Dự đoán hướng đáp và mẫu câu gián tiếp"
        actions={[
          {
            clickTarget: "1. Xem hướng đáp trực tiếp",
            expectedResult: "Mẫu câu trả lời trực diện của ETS.",
          },
          {
            clickTarget: "2. Chạm lật thẻ câu né tránh",
            expectedResult: "Nghe phát âm và học mẫu câu gián tiếp.",
          },
          {
            clickTarget: "3. Sang câu tiếp hoặc Bước 5",
            expectedResult: "Chuyển sang Shadowing cặp đúng.",
          }
        ]}
        nextStepName="Bước 5: Shadowing Cặp Đúng"
      />

      {/* Question Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {questions.map((q, idx) => {
          const isSelected = idx === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                'px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all shrink-0 flex items-center gap-2 cursor-pointer border',
                isSelected
                  ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50'
              )}
            >
              <span>Câu {q.questionNumber || idx + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Question Context Header */}
      <div className="bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-black uppercase text-teal-700 dark:text-teal-400">
            Câu hỏi đang rèn phản xạ:
          </span>
          <div className="text-base sm:text-lg font-black text-foreground">
            {currentQ.questionText}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => speakText(currentQ.questionText)}
          className="rounded-xl font-bold border-teal-300 text-teal-700 dark:text-teal-300"
        >
          <Volume2 className="w-4 h-4 mr-1" /> Nghe lại
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* SECTION A: ĐOÁN HƯỚNG TRẢ LỜI TRỰC TIẾP */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800">
            <Compass className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className="font-black text-foreground text-xs uppercase tracking-wider">
              1. Hướng trả lời trực tiếp
            </h3>
          </div>

          <div className="space-y-2">
            {currentQ.reflexDirection2.predictedDirectDirections.map((dir, idx) => (
              <div
                key={idx}
                className="bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/80 rounded-xl p-3 flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-black text-xs shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-foreground">{dir}</span>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => speakText(dir)}
                  className="rounded-full w-7 h-7 shrink-0 text-slate-500 hover:text-teal-600"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION B: PHẢN XẠ CÂU TRẢ LỜI GIÁN TIẾP KINH ĐIỂN */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="font-black text-foreground text-xs uppercase tracking-wider">
                2. Câu gián tiếp (Chạm để lật)
              </h3>
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              Lật thẻ 🔄
            </span>
          </div>

          <div className="space-y-2.5">
            {currentQ.reflexDirection2.commonIndirectResponses.map((item, idx) => {
              const cardKey = `${currentQ.id}-${idx}`;
              const isFlipped = !!flippedCards[cardKey];

              return (
                <div
                  key={idx}
                  onClick={() => toggleFlip(cardKey, item.englishResponse)}
                  className={cn(
                    'p-3.5 rounded-xl border transition-all cursor-pointer relative select-none',
                    isFlipped
                      ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 shadow-sm'
                      : 'bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                        {item.explanation}
                      </div>

                      <div className="text-xs sm:text-sm font-bold text-foreground">
                        🗣️ &ldquo;{item.vietnamesePrompt}&rdquo;
                      </div>

                      {isFlipped ? (
                        <div className="pt-1.5 text-xs sm:text-sm font-black text-amber-700 dark:text-amber-300 flex items-center gap-1.5 animate-in fade-in">
                          <span>➔ {item.englishResponse}</span>
                          <Volume2 className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground font-bold pt-0.5 flex items-center gap-1">
                          <RotateCw className="w-3 h-3 animate-spin" />
                          <span>Chạm xem tiếng Anh</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
          <span>Tiếp tục: Shadowing Cặp Đúng (3-5 lần) →</span>
        </Button>
      </div>
    </div>
  );
};
