import React, { useState, useEffect, useCallback } from 'react';
import { Part2CoachQuestion } from '@/types/part2Coach';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Award,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';
import { useSound } from '@/hooks/useSound';
import { Part2SpatialWaveformPlayer } from './Part2SpatialWaveformPlayer';

interface Part2Step7ExamModeProps {
  questions: Part2CoachQuestion[];
  step1Diagnostics?: Record<number, { guess: 'A' | 'B' | 'C'; rating: number }>;
  onCompleteStep: () => void;
}

export const Part2Step7ExamMode: React.FC<Part2Step7ExamModeProps> = ({
  questions,
  onCompleteStep,
}) => {
  const { playSound } = useSound();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, 'A' | 'B' | 'C'>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

  const currentQ = questions[currentIndex];

  const playExamAudio = useCallback(() => {
    if (!currentQ) return;
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
  }, [currentQ]);

  // Audio subscription
  useEffect(() => {
    const unsubscribe = soundAudioPlayer.subscribe((playing) => {
      setIsPlaying(playing);
      if (!playing) setActiveStepIndex(null);
    });
    return () => {
      unsubscribe();
      soundAudioPlayer.stop();
    };
  }, []);

  // Auto-play when question changes (if not submitted)
  useEffect(() => {
    if (isSubmitted) return;
    soundAudioPlayer.stop();
    setIsPlaying(false);
    setActiveStepIndex(null);

    const timer = setTimeout(() => {
      playExamAudio();
    }, 250);

    return () => {
      clearTimeout(timer);
      soundAudioPlayer.stop();
    };
  }, [currentIndex, isSubmitted, playExamAudio]);

  const togglePlayAudio = () => {
    if (isPlaying) {
      soundAudioPlayer.stop();
      setIsPlaying(false);
      setActiveStepIndex(null);
    } else {
      playExamAudio();
    }
  };

  const handleReplay = () => {
    soundAudioPlayer.stop();
    setIsPlaying(false);
    setActiveStepIndex(null);
    playExamAudio();
  };

  const handleSelectSegment = useCallback((segIdx: number) => {
    if (!currentQ) return;
    soundAudioPlayer.stop();
    setIsPlaying(true);
    setActiveStepIndex(segIdx);

    const aText = currentQ.correctChoice.letter === 'A' ? currentQ.correctChoice.text : currentQ.distractors.find(d => d.letter === 'A')?.text || '';
    const bText = currentQ.correctChoice.letter === 'B' ? currentQ.correctChoice.text : currentQ.distractors.find(d => d.letter === 'B')?.text || '';
    const cText = currentQ.correctChoice.letter === 'C' ? currentQ.correctChoice.text : currentQ.distractors.find(d => d.letter === 'C')?.text || '';

    let textToSpeak = '';
    if (segIdx === 0) textToSpeak = currentQ.questionText;
    else if (segIdx === 1) textToSpeak = `(A) ${aText}`;
    else if (segIdx === 2) textToSpeak = `(B) ${bText}`;
    else if (segIdx === 3) textToSpeak = `(C) ${cText}`;

    if (textToSpeak) {
      soundAudioPlayer.speakText(textToSpeak, 0.95).finally(() => {
        setIsPlaying(false);
        setActiveStepIndex(null);
      });
    }
  }, [currentQ]);

  const handleSelectChoice = (choice: 'A' | 'B' | 'C') => {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({ ...prev, [currentQ.id]: choice }));
  };

  const handleSubmit = () => {
    soundAudioPlayer.stop();
    setIsSubmitted(true);
    playSound('correct');
  };

  const handleRetry = () => {
    setUserAnswers({});
    setIsSubmitted(false);
    setCurrentIndex(0);
  };

  const answeredCount = Object.keys(userAnswers).length;

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, questions.length]);

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
      } else if (!isSubmitted && (e.key === '1' || e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        handleSelectChoice('A');
      } else if (!isSubmitted && (e.key === '2' || e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        handleSelectChoice('B');
      } else if (!isSubmitted && (e.key === '3' || e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handleSelectChoice('C');
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
  }, [handlePrev, handleNext, isSubmitted, currentQ]);

  // Score calculation
  const correctCount = questions.filter(
    (q) => userAnswers[q.id] === q.correctChoice.letter
  ).length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3 bg-card border border-border/70 px-4 py-2.5 rounded-2xl shadow-soft-xs">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground min-w-0">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
          <span className="font-black text-blue-600 dark:text-blue-400">B6: Thực chiến</span>
          <span className="text-muted-foreground text-xs">• Đã làm: {answeredCount}/{questions.length}</span>
        </div>

        {!isSubmitted ? (
          <Button
            size="sm"
            onClick={handleSubmit}
            className="h-8 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs cursor-pointer"
          >
            Nộp bài
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            className="h-8 px-3 rounded-xl font-bold text-xs border-border cursor-pointer"
          >
            Làm lại
          </Button>
        )}
      </div>

      {/* Full Test Style Question Grid */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {questions.map((q, idx) => {
          const isSelected = idx === currentIndex;
          const choice = userAnswers[q.id];
          const isCorrect = choice === q.correctChoice.letter;

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl font-black text-xs transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border',
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                  : isSubmitted
                  ? isCorrect
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                  : choice
                  ? 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent'
              )}
            >
              <span>Câu {q.questionNumber || idx + 1}</span>
              {choice && !isSubmitted && <span className="font-mono">({choice})</span>}
              {isSubmitted && (isCorrect ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-rose-500" />)}
            </button>
          );
        })}
      </div>

      {/* Main Examination View */}
      {!isSubmitted ? (
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-soft-sm">
          {/* Spatial Waveform Player */}
          <Part2SpatialWaveformPlayer
            isPlaying={isPlaying}
            activeSegmentIndex={activeStepIndex}
            onTogglePlay={togglePlayAudio}
            onReplay={handleReplay}
            onPrevQuestion={handlePrev}
            onNextQuestion={handleNext}
            canPrev={currentIndex > 0}
            canNext={currentIndex < questions.length - 1}
            onSelectSegment={handleSelectSegment}
            currentQuestionText={currentQ?.questionText}
          />

          {/* Answer Choice Buttons (A, B, C) */}
          <div className="space-y-3">
            {(['A', 'B', 'C'] as const).map((choice, i) => {
              const isSelected = userAnswers[currentQ.id] === choice;
              const isSpeaking = activeStepIndex === i + 1;

              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => handleSelectChoice(choice)}
                  className={cn(
                    'w-full p-4 rounded-2xl border font-bold transition-all flex items-center justify-between gap-3 cursor-pointer text-left',
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                      : isSpeaking
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-300 ring-2 ring-blue-500/20'
                      : 'bg-muted/30 border-border hover:bg-muted/70 text-foreground'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm',
                      isSelected
                        ? 'bg-white text-blue-600'
                        : 'bg-card border border-border text-foreground'
                    )}>
                      {choice}
                    </span>
                    <span className="text-sm sm:text-base font-bold">
                      Đáp án {choice}
                    </span>
                  </div>

                  <span className={cn(
                    'text-xs font-mono px-2 py-0.5 rounded-md border',
                    isSelected
                      ? 'border-white/40 text-white'
                      : 'border-border text-muted-foreground'
                  )}>
                    Phím {i + 1}
                  </span>
                </button>
              );
            })}
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
              variant="ghost"
              onClick={handleNext}
              disabled={currentIndex === questions.length - 1}
              className="h-9 px-3 rounded-xl font-bold text-xs cursor-pointer"
            >
              Tiếp
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      ) : (
        /* Results View when Submitted */
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-soft-sm">
          {/* Result Banner */}
          <div className="bg-muted/40 border border-border/80 rounded-2xl p-6 text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              <span className="text-2xl sm:text-3xl font-black text-foreground">
                {correctCount} / {questions.length} câu đúng
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Độ chính xác: {Math.round((correctCount / questions.length) * 100)}%
            </p>
          </div>

          {/* Review Current Question */}
          <div className="bg-muted/30 border border-border/80 rounded-2xl p-5 space-y-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                Chi tiết Câu {currentQ.questionNumber || currentIndex + 1}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReplay}
                className="rounded-xl text-xs font-bold cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 mr-1" />
                Nghe lại
              </Button>
            </div>

            <div className="text-base font-black text-foreground">
              "{currentQ.questionText}"
            </div>
            <div className="text-xs text-muted-foreground">
              {currentQ.questionTranslation}
            </div>

            {/* Answer comparison */}
            <div className="pt-2 border-t border-border/60 space-y-1.5">
              <div className="text-xs font-bold">
                Bạn chọn: <span className={cn(
                  'font-black',
                  userAnswers[currentQ.id] === currentQ.correctChoice.letter
                    ? 'text-emerald-500'
                    : 'text-rose-500'
                )}>{userAnswers[currentQ.id] || 'Chưa chọn'}</span>
                {' • '}
                Đáp án đúng: <span className="text-emerald-500 font-black">{currentQ.correctChoice.letter}</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-foreground">
                "{currentQ.correctChoice.text}"
              </div>
              <div className="text-xs text-muted-foreground">
                {currentQ.correctChoice.translation}
              </div>
            </div>
          </div>

          {/* Navigation & Completion */}
          <div className="flex items-center justify-between pt-4 border-t border-border/60">
            <Button
              variant="outline"
              onClick={handleRetry}
              className="h-9 px-4 rounded-xl font-bold text-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Làm lại
            </Button>

            <Button
              onClick={onCompleteStep}
              className="h-9 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer"
            >
              Sang B7
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
