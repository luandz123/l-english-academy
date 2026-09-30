import React, { useState } from 'react';
import { Part2CoachQuestion } from '@/types/part2Coach';
import { Button } from '@/components/ui/button';
import {
  Volume2,
  CheckCircle2,
  ArrowRight,
  Info,
  ChevronRight,
  ChevronLeft,
  Square,
  Sparkles,
  HelpCircle,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';

interface Part2Step6TrapHunterProps {
  questions: Part2CoachQuestion[];
  onCompleteStep: () => void;
}

export const Part2Step6TrapHunter: React.FC<Part2Step6TrapHunterProps> = ({
  questions,
  onCompleteStep,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [unlockedTraps, setUnlockedTraps] = useState<Record<string, boolean>>({});
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const { playSound } = useSound();

  const currentQ = questions[currentIndex];
  const distractors = currentQ.distractors || [];
  const trap1 = distractors[0];
  const trap2 = distractors[1];

  const trapKey1 = trap1 ? `${currentQ.id}-${trap1.letter}` : '';
  const trapKey2 = trap2 ? `${currentQ.id}-${trap2.letter}` : '';

  const isTrap1Understood = !!unlockedTraps[trapKey1];
  const isTrap2Understood = !!unlockedTraps[trapKey2];

  const understoodCount = (isTrap1Understood ? 1 : 0) + (isTrap2Understood ? 1 : 0);
  const totalTraps = Math.min(2, distractors.length);

  const toggleUnderstandTrap = (key: string) => {
    playSound('correct');
    setUnlockedTraps((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handlePlayAudio = async (key: string, textOrUrl: string, isUrl: boolean = false) => {
    if (playingKey === key) {
      soundAudioPlayer.stop();
      setPlayingKey(null);
      return;
    }
    soundAudioPlayer.stop();
    setPlayingKey(key);
    try {
      if (isUrl && (textOrUrl.startsWith('http') || textOrUrl.startsWith('/'))) {
        await soundAudioPlayer.playUrl(textOrUrl, audioSpeed);
      } else {
        await soundAudioPlayer.speakText(textOrUrl, audioSpeed);
      }
    } finally {
      setPlayingKey(null);
    }
  };

  const toggleSpeed = () => {
    setAudioSpeed((prev) => (prev === 1.0 ? 0.75 : 1.0));
  };

  // Helper to render question text with highlighted stem
  const renderQuestionWithStem = () => {
    const stem = currentQ.questionStem?.text;
    const text = currentQ.questionText;
    if (!stem || !text.toLowerCase().includes(stem.toLowerCase())) {
      return <span>{text}</span>;
    }

    const idx = text.toLowerCase().indexOf(stem.toLowerCase());
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + stem.length);
    const after = text.slice(idx + stem.length);

    return (
      <span>
        {before}
        <span className="text-purple-600 dark:text-purple-400 font-black underline decoration-purple-400/60 decoration-2 underline-offset-4">
          {match}
        </span>
        {after}
      </span>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Header Line: Tiêu đề 1 dòng + Nút Hướng dẫn */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
            Bước 6 · Bóc mẽ cạm bẫy
          </h2>
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
            (So sánh 2 bẫy &amp; Đáp án đúng)
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border',
            showGuide
              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300'
              : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50'
          )}
        >
          <Info className="w-3.5 h-3.5 text-purple-600" />
          <span>Hướng dẫn</span>
        </button>
      </div>

      {/* Collapsible Quick Guide */}
      {showGuide && (
        <div className="bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 rounded-2xl p-4 text-xs sm:text-sm text-purple-950 dark:text-purple-200 space-y-2 relative transition-all">
          <button
            type="button"
            onClick={() => setShowGuide(false)}
            className="absolute top-3 right-3 text-purple-500 hover:text-purple-700"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="font-bold flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
            <Sparkles className="w-4 h-4" />
            <span>Mẹo học bước này:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-zinc-300 font-medium pl-1">
            <li>
              Quan sát <strong>2 thẻ đỏ (Bẫy 1 &amp; 2)</strong> đặt ngay cạnh <strong>thẻ xanh (Đáp án đúng)</strong> để nhận ra sự khác biệt logic.
            </li>
            <li>
              Bấm <strong>nút loa lớn</strong> để nghe cách phát âm gây nhầm lẫn (từ đồng âm, từ lặp).
            </li>
            <li>
              Bấm <strong>Đã hiểu ✓</strong> ở từng bẫy để ghi nhớ kinh nghiệm phòng thi.
            </li>
          </ul>
        </div>
      )}

      {/* 2. Tabs Row: Tab câu hỏi có trạng thái & Bộ đếm */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-2.5 sm:px-3 sm:py-2 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 sm:pb-0">
          {questions.map((q, idx) => {
            const isSelected = idx === currentIndex;
            const qTrapKey1 = q.distractors[0] ? `${q.id}-${q.distractors[0].letter}` : '';
            const qTrapKey2 = q.distractors[1] ? `${q.id}-${q.distractors[1].letter}` : '';
            const isFullyUnderstood = !!unlockedTraps[qTrapKey1] && !!unlockedTraps[qTrapKey2];

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  soundAudioPlayer.stop();
                  setPlayingKey(null);
                  setCurrentIndex(idx);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-xl font-black text-xs transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border',
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : isFullyUnderstood
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                )}
              >
                <span>Câu {q.questionNumber || idx + 1}</span>
                {isFullyUnderstood && (
                  <CheckCircle2 className={cn('w-3.5 h-3.5', isSelected ? 'text-white' : 'text-emerald-500')} />
                )}
              </button>
            );
          })}
        </div>

        {/* Counter */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 text-xs font-bold text-muted-foreground">
          <span>Đã hiểu:</span>
          <span
            className={cn(
              'px-2.5 py-0.5 rounded-full font-black text-xs border',
              understoodCount === totalTraps
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300'
            )}
          >
            {understoodCount}/{totalTraps} bẫy
          </span>
        </div>
      </div>

      {/* 3. Question Box: Câu hỏi to, audio nổi bật (>= 40px) */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="text-[11px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Câu hỏi #{currentQ.questionNumber} • {currentQ.questionStem?.label || 'Part 2'}
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-black text-foreground tracking-tight leading-snug">
            {renderQuestionWithStem()}
          </div>
          <div className="text-sm font-medium text-muted-foreground">
            {currentQ.questionTranslation}
          </div>
        </div>

        {/* Audio controls */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
          {/* Speed Toggle */}
          <button
            type="button"
            onClick={toggleSpeed}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-black text-slate-700 dark:text-zinc-300 hover:bg-slate-100 transition-colors"
            title="Đổi tốc độ phát"
          >
            {audioSpeed}x
          </button>

          {/* Big Audio Button (48px) */}
          <button
            type="button"
            onClick={() => handlePlayAudio('question', currentQ.audioUrl || currentQ.questionText, !!currentQ.audioUrl)}
            className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md transition-all cursor-pointer',
              playingKey === 'question'
                ? 'bg-purple-700 ring-4 ring-purple-600/30 animate-pulse'
                : 'bg-purple-600 hover:bg-purple-700 hover:scale-105 active:scale-95 shadow-purple-600/25'
            )}
            title="Nghe câu hỏi"
          >
            {playingKey === 'question' ? (
              <Square className="w-5 h-5 fill-white" />
            ) : (
              <Volume2 className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* 4. Three-Column Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 items-stretch">
        {/* CARD 1: ✗ BẪY 1 */}
        {trap1 ? (
          <div className="bg-rose-50/25 dark:bg-rose-950/20 border-2 border-rose-200 dark:border-rose-900/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-sm">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-rose-100 dark:border-rose-900/60">
                <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                  ✗ BẪY 1 ({trap1.letter})
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  {trap1.trapNameVi}
                </span>
              </div>

              {/* Text */}
              <div className="text-base sm:text-lg font-black text-foreground leading-snug">
                &ldquo;{trap1.text}&rdquo;
              </div>

              {/* Audio row */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handlePlayAudio(`distractor-1`, trap1.text)}
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer border',
                    playingKey === 'distractor-1'
                      ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-400/40 animate-pulse'
                      : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-200'
                  )}
                  title="Nghe câu bẫy này"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <div className="text-xs text-muted-foreground font-medium leading-tight">
                  <span className="font-bold text-foreground">Nghĩa: </span>
                  {trap1.translation}
                </div>
              </div>

              {/* Vì sao sai */}
              <div className="bg-white/80 dark:bg-zinc-900/80 border border-rose-200/80 dark:border-rose-900/60 rounded-xl p-3 space-y-1">
                <div className="text-xs font-black uppercase text-rose-600 dark:text-rose-400">
                  Vì sao sai:
                </div>
                <p className="text-xs sm:text-[13px] text-slate-700 dark:text-zinc-300 font-medium leading-relaxed">
                  {trap1.analysisVi}
                </p>
              </div>
            </div>

            {/* Action button */}
            <div className="pt-2">
              <Button
                type="button"
                size="sm"
                onClick={() => toggleUnderstandTrap(trapKey1)}
                className={cn(
                  'w-full rounded-xl text-xs font-bold transition-all py-2 cursor-pointer',
                  isTrap1Understood
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    : 'bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50'
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                <span>{isTrap1Understood ? 'Đã hiểu bẫy này ✓' : 'Đánh dấu đã hiểu bẫy'}</span>
              </Button>
            </div>
          </div>
        ) : null}

        {/* CARD 2: ✗ BẪY 2 */}
        {trap2 ? (
          <div className="bg-rose-50/25 dark:bg-rose-950/20 border-2 border-rose-200 dark:border-rose-900/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-sm">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-rose-100 dark:border-rose-900/60">
                <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                  ✗ BẪY 2 ({trap2.letter})
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  {trap2.trapNameVi}
                </span>
              </div>

              {/* Text */}
              <div className="text-base sm:text-lg font-black text-foreground leading-snug">
                &ldquo;{trap2.text}&rdquo;
              </div>

              {/* Audio row */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handlePlayAudio(`distractor-2`, trap2.text)}
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer border',
                    playingKey === 'distractor-2'
                      ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-400/40 animate-pulse'
                      : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-200'
                  )}
                  title="Nghe câu bẫy này"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <div className="text-xs text-muted-foreground font-medium leading-tight">
                  <span className="font-bold text-foreground">Nghĩa: </span>
                  {trap2.translation}
                </div>
              </div>

              {/* Vì sao sai */}
              <div className="bg-white/80 dark:bg-zinc-900/80 border border-rose-200/80 dark:border-rose-900/60 rounded-xl p-3 space-y-1">
                <div className="text-xs font-black uppercase text-rose-600 dark:text-rose-400">
                  Vì sao sai:
                </div>
                <p className="text-xs sm:text-[13px] text-slate-700 dark:text-zinc-300 font-medium leading-relaxed">
                  {trap2.analysisVi}
                </p>
              </div>
            </div>

            {/* Action button */}
            <div className="pt-2">
              <Button
                type="button"
                size="sm"
                onClick={() => toggleUnderstandTrap(trapKey2)}
                className={cn(
                  'w-full rounded-xl text-xs font-bold transition-all py-2 cursor-pointer',
                  isTrap2Understood
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    : 'bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50'
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                <span>{isTrap2Understood ? 'Đã hiểu bẫy này ✓' : 'Đánh dấu đã hiểu bẫy'}</span>
              </Button>
            </div>
          </div>
        ) : null}

        {/* CARD 3: ✓ ĐÁP ÁN ĐÚNG */}
        <div className="bg-emerald-50/30 dark:bg-emerald-950/20 border-2 border-emerald-400/80 dark:border-emerald-700/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-sm ring-1 ring-emerald-500/20">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-emerald-200 dark:border-emerald-800">
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                ✓ ĐÁP ÁN ĐÚNG ({currentQ.correctChoice.letter})
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Chuẩn mục tiêu
              </span>
            </div>

            {/* Text */}
            <div className="text-base sm:text-lg font-black text-foreground leading-snug">
              &ldquo;{currentQ.correctChoice.text}&rdquo;
            </div>

            {/* Audio row */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handlePlayAudio(`correct`, currentQ.correctChoice.text)}
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer border',
                  playingKey === 'correct'
                    ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400/40 animate-pulse'
                    : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200'
                )}
                title="Nghe đáp án đúng"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <div className="text-xs text-muted-foreground font-medium leading-tight">
                <span className="font-bold text-foreground">Nghĩa: </span>
                {currentQ.correctChoice.translation}
              </div>
            </div>

            {/* Vì sao đúng */}
            <div className="bg-white/80 dark:bg-zinc-900/80 border border-emerald-200/80 dark:border-emerald-800 rounded-xl p-3 space-y-1">
              <div className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">
                Vì sao đúng:
              </div>
              <p className="text-xs sm:text-[13px] text-slate-700 dark:text-zinc-300 font-medium leading-relaxed">
                Trả lời đúng trọng tâm {currentQ.questionStem?.label ? `câu hỏi "${currentQ.questionStem.label}"` : 'câu hỏi'}. {currentQ.questionStem?.tip || currentQ.reflexDirection1?.questionIntent || 'Khớp với ngữ cảnh hội thoại TOEIC.'}
              </p>
            </div>
          </div>

          {/* Bottom Confirmation Badge */}
          <div className="pt-2">
            <div className="w-full py-2 px-3 rounded-xl bg-emerald-100/90 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-xs font-black text-center flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Đáp án chính xác ✓</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Single Unified CTA Navigation */}
      <div className="flex items-center justify-between gap-3 pt-3">
        <div>
          {currentIndex > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                soundAudioPlayer.stop();
                setPlayingKey(null);
                setCurrentIndex((prev) => prev - 1);
              }}
              className="rounded-xl font-bold text-xs border-slate-200 dark:border-zinc-800 hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span>Câu trước</span>
            </Button>
          )}
        </div>

        <div>
          {currentIndex < questions.length - 1 ? (
            <Button
              type="button"
              size="default"
              onClick={() => {
                soundAudioPlayer.stop();
                setPlayingKey(null);
                setCurrentIndex((prev) => prev + 1);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl px-5 py-2.5 text-xs sm:text-sm shadow-md shadow-purple-600/20 cursor-pointer"
            >
              <span>Câu tiếp theo (Câu {questions[currentIndex + 1].questionNumber || currentIndex + 2})</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              size="default"
              onClick={() => {
                soundAudioPlayer.stop();
                setPlayingKey(null);
                onCompleteStep();
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl px-6 py-2.5 text-xs sm:text-sm shadow-md shadow-purple-600/25 cursor-pointer"
            >
              <span>Sang Bước 7: Nghe như thi thật</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
