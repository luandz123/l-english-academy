import React, { useState } from 'react';
import { Part2CoachQuestion } from '@/types/part2Coach';
import { Button } from '@/components/ui/button';
import {
  Volume2,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  Check,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { soundAudioPlayer } from '@/services/soundAudioPlayer';

import { Part2StepGuide } from './Part2StepGuide';

interface Part2Step2ChunksProps {
  questions: Part2CoachQuestion[];
  onCompleteStep: () => void;
}

// Helper to speak chunk text using soundAudioPlayer
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

  return (
    <div className="space-y-6">
      {/* Sleek Minimal Ribbon */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200/80 dark:border-indigo-800/60 px-4 py-2.5 rounded-2xl">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-indigo-800 dark:text-indigo-200 min-w-0">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
          <span className="font-black text-indigo-600 dark:text-indigo-400 shrink-0">B2: Cụm từ (Chunks)</span>
          <span className="text-muted-foreground truncate hidden sm:inline">• Bóc tách từ để hỏi & từ vựng nòng cốt</span>
        </div>
        <span className="text-xs font-bold text-muted-foreground shrink-0">Câu {currentIndex + 1}/{questions.length}</span>
      </div>

      <Part2StepGuide
        stepNumber={2}
        stepTitle="Cụm từ chức năng"
        goal="Đọc to 3 lần từ để hỏi và từ vựng chủ đề"
        actions={[
          {
            clickTarget: "Nghe từ để hỏi 🔊",
            expectedResult: "Audio phát âm mẫu từ để hỏi.",
          },
          {
            clickTarget: "Đọc to theo 3 lần",
            expectedResult: "Luyện cơ hàm phản xạ dạng câu hỏi.",
          },
          {
            clickTarget: "Nghe từ vựng chủ đề",
            expectedResult: "Nghe phát âm chuẩn các cụm từ vựng.",
          }
        ]}
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
                'px-3.5 py-1.5 rounded-xl font-black text-xs transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border',
                isSelected
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50'
              )}
            >
              <span>Câu {q.questionNumber || idx + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Full Question Context Bar */}
      <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
            Câu hỏi gốc (Câu {currentQ.questionNumber})
          </div>
          <div className="text-base sm:text-lg font-black text-foreground">
            {currentQ.questionText}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground font-medium">
            {currentQ.questionTranslation}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => speakChunk(currentQ.questionText)}
          className="self-start sm:self-auto rounded-xl font-bold border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-100"
        >
          <Volume2 className="w-4 h-4 mr-1.5" />
          Phát âm cả câu
        </Button>
      </div>

      {/* 2 Core Columns: Group 1 (Stem) & Group 2 (Vocab/Collocations) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CARD 1: TỪ ĐỂ HỎI & TRỢ ĐỘNG TỪ */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs">
                A
              </span>
              <h3 className="font-black text-foreground text-sm uppercase tracking-wider">
                Nhóm 1: Từ để hỏi &amp; Trợ động từ
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-extrabold border border-blue-200 dark:border-blue-800">
              {currentQ.questionStem.label}
            </span>
          </div>

          {/* Stem Highlight Box */}
          <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-2xl sm:text-3xl font-black text-blue-700 dark:text-blue-300 tracking-tight">
                {currentQ.questionStem.text}
              </div>
              <Button
                size="sm"
                onClick={handleRepeatStem}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm"
              >
                <Volume2 className="w-4 h-4 mr-1" />
                Nghe đọc
              </Button>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 font-medium leading-relaxed">
              💡 <strong>Mẹo vàng TOEIC:</strong> {currentQ.questionStem.tip}
            </p>
          </div>

          {/* Repeat aloud interactive counter */}
          <div className="bg-slate-50 dark:bg-zinc-950/60 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-foreground">
                Đọc to 3 lần để tai &amp; miệng quen xạ:
              </span>
              <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                {(stemRepeats[currentQ.id] || 0)} / 3 lần
              </span>
            </div>

            <div className="flex items-center gap-2">
              {[1, 2, 3].map((num) => {
                const isPassed = (stemRepeats[currentQ.id] || 0) >= num;
                return (
                  <button
                    key={num}
                    onClick={handleRepeatStem}
                    className={cn(
                      'flex-1 py-2 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border',
                      isPassed
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-500 hover:bg-slate-100'
                    )}
                  >
                    {isPassed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                    <span>Lần {num}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CARD 2: TỪ VỰNG CHỦ ĐỀ & COLLOCATIONS */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs">
                B
              </span>
              <h3 className="font-black text-foreground text-sm uppercase tracking-wider">
                Nhóm 2: Từ vựng &amp; Collocations
              </h3>
            </div>
            <span className="text-xs text-muted-foreground font-bold">
              {currentQ.keywordsAndCollocations.length} cụm quan trọng
            </span>
          </div>

          {/* Vocab Items List */}
          <div className="space-y-3">
            {currentQ.keywordsAndCollocations.map((vocab) => {
              const key = `${currentQ.id}-${vocab.term}`;
              const count = vocabRepeats[key] || 0;

              return (
                <div
                  key={vocab.term}
                  className="bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 space-y-2 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-black text-foreground">{vocab.term}</span>
                        <span className="text-xs text-muted-foreground font-mono">{vocab.phonetic}</span>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {vocab.meaningVi}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRepeatVocab(vocab.term)}
                      className="rounded-xl shrink-0 font-bold border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50"
                    >
                      <Volume2 className="w-3.5 h-3.5 mr-1" />
                      Đọc ({count}/3)
                    </Button>
                  </div>

                  {vocab.example && (
                    <div className="text-xs text-muted-foreground italic bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-zinc-800">
                      VD: &ldquo;{vocab.example}&rdquo;
                    </div>
                  )}
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
          <span>Tiếp tục: Phản xạ Chiều 1: Nghe hiểu tức thì →</span>
        </Button>
      </div>
    </div>
  );
};
