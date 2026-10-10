import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WaveformSegment {
  id: string;
  label: string;
  subLabel?: string;
  durationMs?: number;
  isPause?: boolean;
}

interface Part2SpatialWaveformPlayerProps {
  isPlaying: boolean;
  activeSegmentIndex: number | null; // 0: Question, 1: (A), 2: (B), 3: (C)
  onTogglePlay: () => void;
  onReplay: () => void;
  onPrevQuestion?: () => void;
  onNextQuestion?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  onSelectSegment?: (segmentIndex: number) => void;
  segments?: WaveformSegment[];
  currentQuestionText?: string;
  className?: string;
}

const DEFAULT_SEGMENTS: WaveformSegment[] = [
  { id: 'q', label: 'Câu hỏi', subLabel: 'Nghe bắt Key' },
  { id: 'p1', label: 'Nghỉ', isPause: true },
  { id: 'a', label: 'Đáp án (A)', subLabel: 'Lựa chọn A' },
  { id: 'p2', label: 'Nghỉ', isPause: true },
  { id: 'b', label: 'Đáp án (B)', subLabel: 'Lựa chọn B' },
  { id: 'p3', label: 'Nghỉ', isPause: true },
  { id: 'c', label: 'Đáp án (C)', subLabel: 'Lựa chọn C' },
];

export const Part2SpatialWaveformPlayer: React.FC<Part2SpatialWaveformPlayerProps> = ({
  isPlaying,
  activeSegmentIndex,
  onTogglePlay,
  onReplay,
  onPrevQuestion,
  onNextQuestion,
  canPrev = true,
  canNext = true,
  onSelectSegment,
  segments = DEFAULT_SEGMENTS,
  currentQuestionText,
  className,
}) => {
  // Mechanical tactile feedback state for physical keypresses
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  // Global physical keylistener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setPressedKey('Space');
        onTogglePlay();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        setPressedKey('KeyR');
        onReplay();
      } else if (e.code === 'ArrowLeft' && canPrev && onPrevQuestion) {
        e.preventDefault();
        setPressedKey('ArrowLeft');
        onPrevQuestion();
      } else if (e.code === 'ArrowRight' && canNext && onNextQuestion) {
        e.preventDefault();
        setPressedKey('ArrowRight');
        onNextQuestion();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['Space', 'KeyR', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        setPressedKey(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onTogglePlay, onReplay, onPrevQuestion, onNextQuestion, canPrev, canNext]);

  // Map segmentIndex (0, 1, 2, 3) to the non-pause segment items
  const nonPauseSegments = segments.filter((s) => !s.isPause);

  return (
    <div className={cn('w-full bg-card rounded-3xl p-5 sm:p-6 space-y-5 shadow-soft-sm border-0 relative select-none', className)}>
      {/* 1. Interactive Sound Waveform Visualizer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
            <span className="font-extrabold text-foreground flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Sóng âm Part 2: Cấu trúc Câu hỏi &amp; Khoảng dừng
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
            Click vào phân đoạn để nghe lại riêng phần đó
          </span>
        </div>

        {/* Waveform track with segments */}
        <div className="bg-slate-900/95 dark:bg-[#070e1c] rounded-2xl p-3 sm:p-4 border border-cyan-500/20 shadow-inner flex flex-col gap-2">
          {/* Waveform bars grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 items-center min-h-[56px]">
            {segments.map((seg, idx) => {
              // Calculate if this segment is currently active
              const nonPauseIdx = nonPauseSegments.findIndex((s) => s.id === seg.id);
              const isSegmentActive =
                isPlaying &&
                activeSegmentIndex !== null &&
                !seg.isPause &&
                nonPauseIdx === activeSegmentIndex;

              if (seg.isPause) {
                // Pause segment: shows quiet low bars
                return (
                  <div
                    key={seg.id}
                    className="flex flex-col items-center justify-center opacity-40 px-1"
                    title="Khoảng dừng nhịp bắt âm"
                  >
                    <div className="flex items-center gap-0.5 justify-center h-8">
                      <div className="w-1 h-2 rounded-full bg-slate-500" />
                      <div className="w-1 h-3 rounded-full bg-slate-400" />
                      <div className="w-1 h-2 rounded-full bg-slate-500" />
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 mt-1 uppercase font-bold">
                      Nghỉ
                    </span>
                  </div>
                );
              }

              // Active audio speech segment
              const barHeights = [45, 80, 100, 65, 90, 75, 40];

              return (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => {
                    if (onSelectSegment && nonPauseIdx !== -1) {
                      onSelectSegment(nonPauseIdx);
                    }
                  }}
                  className={cn(
                    'group/seg relative rounded-xl p-2 flex flex-col items-center justify-between transition-all duration-200 cursor-pointer text-center',
                    isSegmentActive
                      ? 'bg-purple-600/30 border border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.35)] scale-[1.03]'
                      : 'hover:bg-white/10 border border-transparent'
                  )}
                  title={`Bấm để tua lại: ${seg.label}`}
                >
                  {/* Waveform bars */}
                  <div className="flex items-end justify-center gap-1 h-9">
                    {barHeights.map((h, bIdx) => (
                      <div
                        key={bIdx}
                        className={cn(
                          'w-1 rounded-full transition-all duration-150',
                          isSegmentActive
                            ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse'
                            : 'bg-slate-500/60 group-hover/seg:bg-slate-300'
                        )}
                        style={{
                          height: isSegmentActive
                            ? `${Math.max(10, (h * (0.6 + Math.random() * 0.4)) * 0.35)}px`
                            : `${Math.max(6, h * 0.22)}px`,
                        }}
                      />
                    ))}
                  </div>

                  <span
                    className={cn(
                      'text-[10px] sm:text-[11px] font-black truncate max-w-full mt-1.5 transition-colors',
                      isSegmentActive
                        ? 'text-cyan-300 font-extrabold'
                        : 'text-slate-300 group-hover/seg:text-white'
                    )}
                  >
                    {seg.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Current Question Text preview */}
          {currentQuestionText && (
            <div className="pt-2 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-300 font-medium italic truncate px-2">
                "{currentQuestionText}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Spatial UI Audio Controller with 3D Keycap Badges */}
      <div className="flex items-center justify-center gap-4 pt-1">
        {/* Previous Button with [←] Spatial Keycap */}
        {onPrevQuestion && (
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onPrevQuestion}
              disabled={!canPrev}
              className={cn(
                'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-card border border-border/80 text-foreground flex items-center justify-center transition-all duration-100 shadow-soft-xs cursor-pointer select-none active:translate-y-[2px]',
                pressedKey === 'ArrowLeft' && 'translate-y-[2px] bg-accent shadow-none ring-2 ring-purple-500/40',
                !canPrev && 'opacity-40 cursor-not-allowed'
              )}
              title="Câu trước (Phím ←)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <kbd className="px-1.5 py-0.5 rounded-md bg-muted border border-border/80 text-[10px] font-mono text-muted-foreground font-black shadow-[0_1px_0_rgba(0,0,0,0.15)]">
              ←
            </kbd>
          </div>
        )}

        {/* Play/Pause Button with [Space] Spatial Keycap */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={onTogglePlay}
            className={cn(
              'h-12 sm:h-13 px-7 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-[0_4px_0_#4c1d95] transition-all duration-100 cursor-pointer select-none active:translate-y-[2px] active:shadow-[0_2px_0_#4c1d95]',
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 shadow-[0_4px_0_#b45309]'
                : 'bg-purple-600 hover:bg-purple-700',
              pressedKey === 'Space' && 'translate-y-[2px] shadow-[0_2px_0_#4c1d95] ring-4 ring-purple-400/30'
            )}
            title="Phát / Dừng (Phím Space)"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            <span>{isPlaying ? 'Tạm dừng' : 'Phát âm thanh'}</span>
          </button>
          <kbd className="px-2 py-0.5 rounded-md bg-muted border border-border/80 text-[10px] font-mono text-muted-foreground font-black shadow-[0_1px_0_rgba(0,0,0,0.15)]">
            Space
          </kbd>
        </div>

        {/* Replay Button with [R] Spatial Keycap */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={onReplay}
            className={cn(
              'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-card border border-border/80 text-foreground flex items-center justify-center transition-all duration-100 shadow-soft-xs cursor-pointer select-none active:translate-y-[2px]',
              pressedKey === 'KeyR' && 'translate-y-[2px] bg-accent shadow-none ring-2 ring-purple-500/40'
            )}
            title="Nghe lại từ đầu (Phím R)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <kbd className="px-1.5 py-0.5 rounded-md bg-muted border border-border/80 text-[10px] font-mono text-muted-foreground font-black shadow-[0_1px_0_rgba(0,0,0,0.15)]">
            R
          </kbd>
        </div>

        {/* Next Button with [→] Spatial Keycap */}
        {onNextQuestion && (
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onNextQuestion}
              disabled={!canNext}
              className={cn(
                'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-card border border-border/80 text-foreground flex items-center justify-center transition-all duration-100 shadow-soft-xs cursor-pointer select-none active:translate-y-[2px]',
                pressedKey === 'ArrowRight' && 'translate-y-[2px] bg-accent shadow-none ring-2 ring-purple-500/40',
                !canNext && 'opacity-40 cursor-not-allowed'
              )}
              title="Câu tiếp theo (Phím →)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <kbd className="px-1.5 py-0.5 rounded-md bg-muted border border-border/80 text-[10px] font-mono text-muted-foreground font-black shadow-[0_1px_0_rgba(0,0,0,0.15)]">
              →
            </kbd>
          </div>
        )}
      </div>
    </div>
  );
};

export default Part2SpatialWaveformPlayer;
