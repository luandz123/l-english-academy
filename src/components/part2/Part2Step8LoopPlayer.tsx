import React, { useState, useEffect, useRef } from 'react';
import { Part2CoachQuestion } from '@/types/part2Coach';
import { Button } from '@/components/ui/button';
import {
  Repeat,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Trophy,
  Sparkles,
  Headphones
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';

export interface Part2Step8LoopPlayerProps {
  questions: Part2CoachQuestion[];
  onFinishAllSteps: () => void;
}

export const Part2Step8LoopPlayer: React.FC<Part2Step8LoopPlayerProps> = ({
  questions,
  onFinishAllSteps,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playingPhase, setPlayingPhase] = useState<'question' | 'pause' | 'answer'>('question');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [subtitleMode, setSubtitleMode] = useState<'both' | 'en_only' | 'hidden'>('both');
  const [loopCount, setLoopCount] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const isLoopRunning = useRef(false);
  const { playSound } = useSound();

  const currentQ = questions[currentIdx];

  // Stop sound when unmounted
  useEffect(() => {
    return () => {
      isLoopRunning.current = false;
      soundAudioPlayer.stop();
    };
  }, []);

  const runContinuousLoop = async (startIndex: number) => {
    isLoopRunning.current = true;
    setIsPlaying(true);

    let idx = startIndex;

    while (isLoopRunning.current) {
      setCurrentIdx(idx);
      const q = questions[idx];

      // 1. Speak Question
      setPlayingPhase('question');
      await soundAudioPlayer.speakText(q.questionText, playbackSpeed);
      if (!isLoopRunning.current) break;

      // 2. Pause 1s
      setPlayingPhase('pause');
      await new Promise((r) => setTimeout(r, 1000 / playbackSpeed));
      if (!isLoopRunning.current) break;

      // 3. Speak Correct Answer
      setPlayingPhase('answer');
      await soundAudioPlayer.speakText(q.correctChoice.text, playbackSpeed);
      if (!isLoopRunning.current) break;

      // 4. Pause before next question
      await new Promise((r) => setTimeout(r, 1200 / playbackSpeed));
      if (!isLoopRunning.current) break;

      // Advance
      if (idx === questions.length - 1) {
        idx = 0;
        setLoopCount((prev) => prev + 1);
      } else {
        idx += 1;
      }
    }

    setIsPlaying(false);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      isLoopRunning.current = false;
      setIsPlaying(false);
      soundAudioPlayer.stop();
    } else {
      runContinuousLoop(currentIdx);
    }
  };

  const handleNext = () => {
    const nextIdx = (currentIdx + 1) % questions.length;
    setCurrentIdx(nextIdx);
    if (isPlaying) {
      isLoopRunning.current = false;
      soundAudioPlayer.stop();
      setTimeout(() => runContinuousLoop(nextIdx), 100);
    }
  };

  const handlePrev = () => {
    const prevIdx = (currentIdx - 1 + questions.length) % questions.length;
    setCurrentIdx(prevIdx);
    if (isPlaying) {
      isLoopRunning.current = false;
      soundAudioPlayer.stop();
      setTimeout(() => runContinuousLoop(prevIdx), 100);
    }
  };

  const handleFinish = () => {
    playSound('complete');
    setShowCelebration(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
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
  }, [isPlaying, currentIdx]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Sleek Minimal Ribbon */}
      <div className="flex items-center justify-between gap-3 bg-card border border-border/70 px-4 py-2.5 rounded-2xl shadow-soft-xs">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground min-w-0">
          <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse shrink-0" />
          <span className="font-black text-violet-600 dark:text-violet-400">B7: Nghe ngấm</span>
          <span className="text-muted-foreground text-xs">• Lặp vô thức</span>
        </div>
        <span className="text-xs font-black text-muted-foreground">
          Đã lặp: {loopCount} vòng
        </span>
      </div>

      {/* Main Loop Player Card */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-soft-sm text-center">
        {/* Animated Visualizer */}
        <div className="flex items-center justify-center gap-1.5 h-12">
          {[40, 75, 100, 60, 35, 90, 50, 95, 65, 30].map((h, i) => (
            <div
              key={i}
              className={cn(
                'w-1.5 rounded-full transition-all duration-300',
                isPlaying ? 'bg-violet-600 dark:bg-violet-400 animate-pulse' : 'bg-muted-foreground/20'
              )}
              style={{
                height: isPlaying ? `${h}px` : '8px',
                animationDelay: `${i * 120}ms`
              }}
            />
          ))}
        </div>

        {/* Phase Pill */}
        <div className="min-h-7 flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300 text-xs font-bold border border-violet-500/20">
            <Headphones className="w-3.5 h-3.5" />
            {isPlaying ? (
              playingPhase === 'question'
                ? `Đang đọc Câu ${currentQ.questionNumber || currentIdx + 1}`
                : playingPhase === 'pause'
                ? 'Nghỉ 1s...'
                : 'Đang đọc Đáp án chuẩn'
            ) : (
              'Bấm Phát để chạy vòng lặp'
            )}
          </span>
        </div>

        {/* Subtitles Display Box */}
        {subtitleMode !== 'hidden' && (
          <div className="bg-muted/40 border border-border/80 rounded-2xl p-5 space-y-3 text-left max-w-xl mx-auto">
            <div>
              <div className="text-xs font-black uppercase text-violet-600 dark:text-violet-400">
                Câu hỏi {currentQ.questionNumber || currentIdx + 1}:
              </div>
              <div className="text-base sm:text-lg font-black text-foreground">
                "{currentQ.questionText}"
              </div>
              {subtitleMode === 'both' && (
                <div className="text-xs text-muted-foreground">
                  {currentQ.questionTranslation}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border/60">
              <div className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">
                Đáp án chuẩn ({currentQ.correctChoice.letter}):
              </div>
              <div className="text-base sm:text-lg font-black text-foreground">
                "{currentQ.correctChoice.text}"
              </div>
              {subtitleMode === 'both' && (
                <div className="text-xs text-muted-foreground">
                  {currentQ.correctChoice.translation}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Center Control Buttons */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            className="w-12 h-12 rounded-2xl border-border cursor-pointer"
          >
            <SkipBack className="w-5 h-5" />
          </Button>

          <Button
            size="lg"
            onClick={handleTogglePlay}
            className={cn(
              'h-12 px-7 rounded-2xl text-white font-bold text-sm shadow-md transition-transform active:scale-95 cursor-pointer',
              isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-violet-600 hover:bg-violet-700'
            )}
          >
            {isPlaying ? <Pause className="w-5 h-5 mr-1.5" /> : <Play className="w-5 h-5 ml-0.5 mr-1.5" />}
            {isPlaying ? 'Tạm dừng' : 'Phát'}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            className="w-12 h-12 rounded-2xl border-border cursor-pointer"
          >
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>

        {/* Settings Bar: Speed & Subtitles */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {/* Speed Pills */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
            {[0.8, 1.0, 1.2].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  playbackSpeed === spd
                    ? 'bg-card text-foreground shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Subtitle Mode Pills */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
            {(['both', 'en_only', 'hidden'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSubtitleMode(mode)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  subtitleMode === mode
                    ? 'bg-card text-foreground shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {mode === 'both' ? 'Cả hai' : mode === 'en_only' ? 'Tiếng Anh' : 'Ẩn'}
              </button>
            ))}
          </div>
        </div>

        {/* Completion Action */}
        <div className="pt-4 border-t border-border/60">
          <Button
            size="lg"
            onClick={handleFinish}
            className="h-11 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer"
          >
            <Trophy className="w-4 h-4 mr-1.5" />
            Hoàn thành
          </Button>
        </div>
      </div>

      {/* Celebration Modal / Banner */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-foreground">
                Xuất sắc!
              </h3>
              <p className="text-xs text-muted-foreground">
                Bạn đã hoàn thành trọn vẹn 7 bước luyện phản xạ!
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCelebration(false)}
                className="rounded-xl text-xs font-bold"
              >
                Đóng
              </Button>
              <Button
                onClick={() => {
                  setShowCelebration(false);
                  onFinishAllSteps();
                }}
                className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
              >
                Đổi cụm khác
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
