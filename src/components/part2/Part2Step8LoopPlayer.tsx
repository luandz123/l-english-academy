import React, { useState, useEffect, useRef } from 'react';
import { Part2CoachQuestion } from '@/types/part2Coach';
import { Button } from '@/components/ui/button';
import {
  Repeat,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Volume2,
  CheckCircle2,
  Trophy,
  Sparkles,
  Eye,
  EyeOff,
  Flame,
  Award,
  Headphones,
  Compass
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';
import { Part2StepGuide } from './Part2StepGuide';
import { PART2_STEPS_META } from '@/data/part2CoachData';
import { XP_REWARDS } from '@/hooks/useGamification';

export interface Part2Step8LoopPlayerProps {
  questions: Part2CoachQuestion[];
  onFinishAllSteps: () => void;
}

export const Part2Step8LoopPlayer: React.FC<Part2Step8LoopPlayerProps> = ({
  questions,
  onFinishAllSteps,
}) => {
  const totalSteps = PART2_STEPS_META.length;
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
      await new Promise((r) => setTimeout(r, 1500 / playbackSpeed));
      if (!isLoopRunning.current) break;

      // Advance to next or loop
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

  return (
    <div className="space-y-6">
      {/* Sleek Minimal Ribbon */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 dark:from-violet-950/40 dark:to-indigo-950/40 border border-violet-200/80 dark:border-violet-800/60 px-4 py-2.5 rounded-2xl">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-violet-800 dark:text-violet-200 min-w-0">
          <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse shrink-0" />
          <span className="font-black text-violet-600 dark:text-violet-400 shrink-0">B8: Nghe liên tục (Loop)</span>
          <span className="text-muted-foreground truncate hidden sm:inline">• Tự động phát lặp [Câu hỏi ➔ Đáp án đúng]</span>
        </div>
        <span className="text-xs font-bold text-violet-700 dark:text-violet-300 shrink-0">
          {isPlaying ? 'Đang phát...' : 'Tạm dừng'}
        </span>
      </div>

      {/* Interactive Step Guide */}
      <Part2StepGuide
        stepNumber={8}
        stepTitle="Nghe thụ động vòng lặp"
        goal="Bật audio tự động lặp ngấm âm điệu"
        actions={[
          {
            clickTarget: "1. Bấm nút Play (▶)",
            expectedResult: "Trình phát tự động chạy toàn bộ các câu.",
          },
          {
            clickTarget: "2. Chọn tốc độ (0.8x - 1.4x)",
            expectedResult: "Thay đổi tốc độ đọc.",
          },
          {
            clickTarget: "3. Chọn phụ đề hoặc ẩn",
            expectedResult: "Nghe chay để luyện phản xạ vô thức.",
          }
        ]}
      />

      {/* Main Music Player Card */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Top Controls: Speed & Subtitles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800">
          {/* Subtitle Mode */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-muted-foreground">Phụ đề:</span>
            <div className="inline-flex p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl">
              <button
                type="button"
                onClick={() => setSubtitleMode('both')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  subtitleMode === 'both' ? 'bg-white dark:bg-zinc-900 text-foreground shadow-sm' : 'text-muted-foreground'
                )}
                title="Hiện cả tiếng Anh và dịch tiếng Việt"
              >
                Song ngữ
              </button>
              <button
                type="button"
                onClick={() => setSubtitleMode('en_only')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  subtitleMode === 'en_only' ? 'bg-white dark:bg-zinc-900 text-foreground shadow-sm' : 'text-muted-foreground'
                )}
                title="Chỉ hiện phụ đề tiếng Anh"
              >
                Chỉ Tiếng Anh
              </button>
              <button
                type="button"
                onClick={() => setSubtitleMode('hidden')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  subtitleMode === 'hidden' ? 'bg-white dark:bg-zinc-900 text-foreground shadow-sm' : 'text-muted-foreground'
                )}
                title="Ẩn hoàn toàn chữ, chỉ nghe thụ động"
              >
                Ẩn (Nghe thụ động)
              </button>
            </div>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-muted-foreground">Tốc độ:</span>
            <div className="inline-flex p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl">
              {[0.8, 1.0, 1.2, 1.4].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setPlaybackSpeed(speed)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    playbackSpeed === speed ? 'bg-purple-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title={`Phát ở tốc độ ${speed}x`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Current Active Subtitle Display Stage */}
        <div className="min-h-[220px] bg-slate-50 dark:bg-zinc-950/60 rounded-3xl p-6 sm:p-8 flex flex-col justify-center items-center text-center space-y-4 border border-slate-200/80 dark:border-zinc-800">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-black">
            <span>Câu {currentQ.questionNumber} ({currentIdx + 1}/{questions.length})</span>
            {loopCount > 0 && <span>• Vòng lặp #{loopCount + 1}</span>}
          </div>

          {subtitleMode !== 'hidden' ? (
            <div className="space-y-4 max-w-xl">
              {/* Question line */}
              <div
                className={cn(
                  'transition-all duration-300',
                  playingPhase === 'question' ? 'scale-105 font-black text-purple-700 dark:text-purple-300' : 'text-foreground font-bold opacity-80'
                )}
              >
                <div className="text-lg sm:text-2xl leading-relaxed">
                  &ldquo;{currentQ.questionText}&rdquo;
                </div>
                {subtitleMode === 'both' && (
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {currentQ.questionTranslation}
                  </div>
                )}
              </div>

              {/* Arrow divider */}
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-500 mx-auto flex items-center justify-center font-black text-xs">
                ➔
              </div>

              {/* Answer line */}
              <div
                className={cn(
                  'transition-all duration-300',
                  playingPhase === 'answer' ? 'scale-105 font-black text-emerald-600 dark:text-emerald-400' : 'text-foreground font-bold opacity-80'
                )}
              >
                <div className="text-lg sm:text-2xl leading-relaxed">
                  ({currentQ.correctChoice.letter}) &ldquo;{currentQ.correctChoice.text}&rdquo;
                </div>
                {subtitleMode === 'both' && (
                  <div className="text-xs sm:text-sm text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                    {currentQ.correctChoice.translation}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-6 text-center">
              <Headphones className="w-12 h-12 text-purple-600 dark:text-purple-400 mx-auto animate-bounce" />
              <div className="text-base font-bold text-foreground">
                Đang ở chế độ Ẩn chữ (Nghe thụ động vô thức)
              </div>
              <p className="text-xs text-muted-foreground max-w-sm">
                Nhắm mắt lại và để não bộ tự động bắt âm thanh và ngữ điệu tự nhiên của người bản xứ.
              </p>
            </div>
          )}
        </div>

        {/* Media Player Control Bar */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 pt-2">
          {/* Prev */}
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            className="w-12 h-12 rounded-full border-slate-300 dark:border-zinc-700 hover:scale-105 transition-transform"
            title="Câu trước"
          >
            <SkipBack className="w-5 h-5 text-slate-700 dark:text-zinc-300" />
          </Button>

          {/* Big Play/Pause Toggle */}
          <Button
            size="lg"
            onClick={handleTogglePlay}
            className={cn(
              'w-20 h-20 rounded-full text-white shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer',
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30 ring-4 ring-amber-500/20'
                : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30 ring-4 ring-purple-600/20'
            )}
            title={isPlaying ? 'Bấm để tạm dừng phát' : 'Bấm để phát liên tục vòng lặp'}
          >
            {isPlaying ? (
              <Pause className="w-9 h-9" />
            ) : (
              <Play className="w-9 h-9 ml-1 fill-white" />
            )}
          </Button>

          {/* Next */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            className="w-12 h-12 rounded-full border-slate-300 dark:border-zinc-700 hover:scale-105 transition-transform"
            title="Câu kế tiếp"
          >
            <SkipForward className="w-5 h-5 text-slate-700 dark:text-zinc-300" />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground font-medium">
          {isPlaying
            ? 'Đang phát vòng lặp tự động liên tục... Bạn có thể để audio chạy nền khi làm việc khác.'
            : 'Nhấn nút Play tròn lớn ở trên để bắt đầu nghe thụ động'}
        </p>
      </div>

      {/* Completion Button */}
      <div className="flex justify-end pt-2">
        <Button
          size="lg"
          onClick={handleFinish}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl px-8 py-6 text-base shadow-xl shadow-emerald-600/25 cursor-pointer"
        >
          <Trophy className="w-5 h-5 mr-2 text-yellow-300" />
          <span>Hoàn thành cụm này</span>
        </Button>
      </div>

      {/* Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-900 flex items-center justify-center mx-auto shadow-lg shadow-amber-400/30">
              <Trophy className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl font-black text-foreground">
                XUẤT SẮC HOÀN THÀNH! 🎉
              </h3>
              <p className="text-sm text-muted-foreground font-medium">
                Bạn đã hoàn thành trọn vẹn <strong>Quy trình {totalSteps} Bước Luyện Nghe Phản Xạ Part 2</strong> cho cụm {questions.length} câu hỏi!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 text-left">
              <div className="space-y-1">
                <span className="text-xs font-black uppercase text-muted-foreground">Kỹ năng đạt được:</span>
                <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Phản xạ 1s, Bóc bẫy &amp; Thực chiến</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-black uppercase text-muted-foreground">Điểm thưởng:</span>
                <div className="text-sm font-black text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>+{XP_REWARDS.PART2_CLUSTER_COMPLETE} XP Phản Xạ</span>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              onClick={() => {
                setShowCelebration(false);
                onFinishAllSteps();
              }}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl py-6 shadow-lg shadow-purple-600/30 text-base cursor-pointer"
            >
              Tiếp tục luyện Cụm khác ➔
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
