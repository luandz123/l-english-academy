import React, { useState, useRef, useEffect } from 'react';
import { Part2CoachQuestion } from '@/types/part2Coach';
import { Button } from '@/components/ui/button';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  CheckCircle2,
  ArrowRight,
  Headphones,
  Sparkles,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Part2StepGuide } from './Part2StepGuide';

interface Part2Step1DiagnosticProps {
  questions: Part2CoachQuestion[];
  onCompleteStep: () => void;
  onSaveDiagnostics?: (data: Record<number, { guess: 'A' | 'B' | 'C'; rating: number }>) => void;
}

export const Part2Step1Diagnostic: React.FC<Part2Step1DiagnosticProps> = ({
  questions,
  onCompleteStep,
  onSaveDiagnostics,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [userGuesses, setUserGuesses] = useState<Record<number, 'A' | 'B' | 'C'>>({});
  const [comprehensionRatings, setComprehensionRatings] = useState<Record<number, number>>({});
  const [showScriptHint, setShowScriptHint] = useState(false);

  const currentQ = questions[currentIndex];

  useEffect(() => {
    // Subscribe to soundAudioPlayer playback state
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

  useEffect(() => {
    // Reset play state and pause when changing question
    soundAudioPlayer.stop();
    setIsPlaying(false);
    setActiveStepIndex(null);
    setShowScriptHint(false);
  }, [currentIndex]);

  const playAudioSequence = () => {
    const aText = currentQ.correctChoice.letter === 'A' ? currentQ.correctChoice.text : currentQ.distractors.find(d => d.letter === 'A')?.text || '';
    const bText = currentQ.correctChoice.letter === 'B' ? currentQ.correctChoice.text : currentQ.distractors.find(d => d.letter === 'B')?.text || '';
    const cText = currentQ.correctChoice.letter === 'C' ? currentQ.correctChoice.text : currentQ.distractors.find(d => d.letter === 'C')?.text || '';

    const items = [
      { text: currentQ.questionText, pauseAfterMs: 900 },
      { text: `(A) ${aText}`, pauseAfterMs: 700 },
      { text: `(B) ${bText}`, pauseAfterMs: 700 },
      { text: `(C) ${cText}`, pauseAfterMs: 400 },
    ];

    soundAudioPlayer.speakSequence(items, {
      rate: 0.95,
      onStepChange: (idx) => {
        setActiveStepIndex(idx);
      },
    });
  };

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

  const handleSelectGuess = (choice: 'A' | 'B' | 'C') => {
    const nextGuesses = { ...userGuesses, [currentQ.id]: choice };
    setUserGuesses(nextGuesses);
    notifyDiagnostics(nextGuesses, comprehensionRatings);
  };

  const handleSetRating = (percent: number) => {
    const nextRatings = { ...comprehensionRatings, [currentQ.id]: percent };
    setComprehensionRatings(nextRatings);
    notifyDiagnostics(userGuesses, nextRatings);
  };

  const notifyDiagnostics = (
    guesses: Record<number, 'A' | 'B' | 'C'>,
    ratings: Record<number, number>
  ) => {
    if (onSaveDiagnostics) {
      const combined: Record<number, { guess: 'A' | 'B' | 'C'; rating: number }> = {};
      questions.forEach((q) => {
        if (guesses[q.id] || ratings[q.id] !== undefined) {
          combined[q.id] = {
            guess: guesses[q.id] || 'A',
            rating: ratings[q.id] || 50,
          };
        }
      });
      onSaveDiagnostics(combined);
    }
  };

  const completedCount = Object.keys(comprehensionRatings).length;
  const isAllAnswered = completedCount >= questions.length;

  return (
    <div className="space-y-6">
      {/* Sleek Minimal Ribbon */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-800/60 px-4 py-2.5 rounded-2xl">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-800 dark:text-blue-200 min-w-0">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
          <span className="font-black text-blue-600 dark:text-blue-400 shrink-0">B1: Đo tai ban đầu</span>
          <span className="text-muted-foreground truncate hidden sm:inline">• Nghe 1 lượt không nhìn chữ để đo tai</span>
        </div>
        <span className="text-xs font-black text-blue-700 dark:text-blue-300 shrink-0">
          {completedCount}/{questions.length} câu
        </span>
      </div>

      {/* Interactive Step Guide */}
      <Part2StepGuide
        stepNumber={1}
        stepTitle="Nghe thử đo tai"
        goal="Nghe 1 lượt không nhìn script để tự đánh giá tai bắt được bao nhiêu %"
        actions={[
          {
            clickTarget: "Play (▶)",
            expectedResult: "Phát câu hỏi và 3 đáp án (A, B, C).",
          },
          {
            clickTarget: "Chọn (A, B hoặc C)",
            expectedResult: "Ghi nhận phương án bạn đoán đúng.",
          },
          {
            clickTarget: "Chọn mức % nghe hiểu",
            expectedResult: "Lưu chỉ số ban đầu để so sánh với Bước 6 (Thực chiến).",
          }
        ]}
        nextStepName="Bước 2: Cụm từ Chunks"
      />

      {/* Question Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {questions.map((q, idx) => {
          const isSelected = idx === currentIndex;
          const isDone = comprehensionRatings[q.id] !== undefined;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl font-black text-xs transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border',
                isSelected
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                  : isDone
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50'
              )}
            >
              <span>Câu {q.questionNumber || idx + 1}</span>
              {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            </button>
          );
        })}
      </div>

      {/* Main Diagnostic Listening Card */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">

        {/* Audio Center Player */}
        <div className="bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={togglePlayAudio}
              className={cn(
                'w-14 h-14 rounded-full text-white shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer',
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
                  : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
              )}
              title={isPlaying ? 'Tạm dừng' : 'Bắt đầu nghe'}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleReplay}
              title="Nghe lại"
              className="w-10 h-10 rounded-full border-slate-300 dark:border-zinc-700 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-600 dark:text-zinc-300" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground font-medium">
            {isPlaying ? (
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {activeStepIndex === 0 && '🔊 Đang đọc: Câu hỏi...'}
                {activeStepIndex === 1 && '🔊 Đang đọc: Đáp án (A)...'}
                {activeStepIndex === 2 && '🔊 Đang đọc: Đáp án (B)...'}
                {activeStepIndex === 3 && '🔊 Đang đọc: Đáp án (C)...'}
                {activeStepIndex === null && '🔊 Đang phát audio câu hỏi + 3 đáp án...'}
              </span>
            ) : (
              'Bấm Play để nghe câu hỏi (A, B, C)'
            )}
          </p>
        </div>

        {/* Action 1: Guess Answer */}
        <div className="space-y-2">
          <div className="text-xs font-black text-foreground uppercase tracking-wider">
            1. Bạn đoán đáp án nào?
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(['A', 'B', 'C'] as const).map((choice, cIdx) => {
              const isSelected = userGuesses[currentQ.id] === choice;
              const isCurrentlySpeaking = activeStepIndex === cIdx + 1;
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => handleSelectGuess(choice)}
                  className={cn(
                    'py-3.5 rounded-2xl border font-bold transition-all duration-120 flex items-center justify-center gap-2 cursor-pointer text-base sm:text-lg select-none active:scale-95 shadow-soft-xs',
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-soft-md'
                      : isCurrentlySpeaking
                      ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 text-purple-700 dark:text-purple-300 ring-2 ring-purple-400/40'
                      : 'bg-card border-border/70 text-foreground hover:border-purple-300 dark:hover:border-purple-700'
                  )}
                >
                  <span>({choice})</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action 2: Self-assessment of comprehension */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-foreground uppercase tracking-wider">
              2. Mức độ nghe hiểu:
            </div>
            {comprehensionRatings[currentQ.id] && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Đã chọn: {comprehensionRatings[currentQ.id]}%
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { percent: 100, label: '100% (Rõ)' },
              { percent: 70, label: '~70% (Khá)' },
              { percent: 40, label: '~40% (Loáng thoáng)' },
              { percent: 20, label: '<20% (Chưa kịp)' },
            ].map((lvl) => {
              const isSelected = comprehensionRatings[currentQ.id] === lvl.percent;
              return (
                <button
                  key={lvl.percent}
                  type="button"
                  onClick={() => handleSetRating(lvl.percent)}
                  className={cn(
                    'py-2.5 px-3 rounded-xl border text-xs font-bold transition-all duration-120 cursor-pointer flex items-center justify-center gap-1.5 select-none active:scale-95 shadow-soft-xs',
                    isSelected
                      ? 'border-purple-600 bg-purple-600 text-white shadow-soft-sm'
                      : 'border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span>{lvl.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Hint Tapescript Toggle */}
        <div className="pt-1 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowScriptHint(!showScriptHint)}
            className="text-xs font-bold text-muted-foreground hover:text-foreground h-8"
          >
            {showScriptHint ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
            {showScriptHint ? 'Ẩn câu hỏi' : 'Xem câu hỏi'}
          </Button>

          {showScriptHint && (
            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-3 py-1 rounded-lg">
              {currentQ.questionText}
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          {currentIndex > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentIndex((prev) => prev - 1)}
              className="rounded-xl font-bold cursor-pointer"
            >
              ← Câu trước
            </Button>
          )}

          {currentIndex < questions.length - 1 && (
            <Button
              variant={userGuesses[currentQ.id] ? 'default' : 'outline'}
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              className={cn(
                'rounded-xl font-bold cursor-pointer transition-all',
                userGuesses[currentQ.id]
                  ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-600/20'
                  : ''
              )}
            >
              <span>Câu tiếp theo</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>

        <Button
          size="default"
          onClick={onCompleteStep}
          className={cn(
            'w-full sm:w-auto font-black rounded-xl px-5 py-2.5 text-xs sm:text-sm shadow-md transition-all cursor-pointer',
            isAllAnswered
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
              : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20'
          )}
        >
          <span>Tiếp tục: Cụm từ chức năng (Chunks) →</span>
        </Button>
      </div>
    </div>
  );
};
