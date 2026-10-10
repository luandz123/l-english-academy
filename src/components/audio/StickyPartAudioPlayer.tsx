import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Headphones, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAudioUrl } from "@/utils/audioUrl";

interface StickyPartAudioPlayerProps {
  audioUrl: string;
  title?: string;
  subtitle?: string;
  partNumber?: number;
  questionRange?: string;
  className?: string;
}

const SPEED_OPTIONS = [0.8, 1.0, 1.2, 1.5];

export const StickyPartAudioPlayer: React.FC<StickyPartAudioPlayerProps> = ({
  audioUrl,
  title,
  subtitle,
  partNumber,
  questionRange,
  className,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  // Auto-pause other audios when this player plays
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    const allAudios = document.getElementsByTagName("audio");
    for (let i = 0; i < allAudios.length; i++) {
      const a = allAudios[i];
      if (a !== audioRef.current && !a.paused) {
        a.pause();
      }
    }
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (!isSeeking && audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, [isSeeking]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.warn("Audio playback interrupted or failed:", err);
      });
    }
  };

  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.min(Math.max(0, audioRef.current.currentTime + seconds), duration || 9999);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const cycleSpeed = () => {
    const nextIdx = (SPEED_OPTIONS.indexOf(playbackRate) + 1) % SPEED_OPTIONS.length;
    const nextSpeed = SPEED_OPTIONS[nextIdx];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const next = !isMuted;
    setIsMuted(next);
    audioRef.current.muted = next;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "sticky top-0 z-30 mb-6 rounded-2xl bg-[#070e1c]/95 border border-cyan-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-200 p-3 sm:p-4",
        className
      )}
    >
      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        src={formatAudioUrl(audioUrl)}
        preload="metadata"
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Top row: Part Badge & Title info */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-cyan-500/20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
            <Headphones className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-white truncate">
                {title || (partNumber ? `Part ${partNumber}` : "Audio nghe chung")}
              </span>
              {questionRange && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shrink-0">
                  {questionRange}
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-400 truncate">
              {subtitle || "File nghe chung phát liên tục cho toàn bộ câu hỏi bên dưới"}
            </p>
          </div>
        </div>

        {/* Speed toggle pill */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={cycleSpeed}
            className="px-2 py-1 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-[11px] font-bold text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            title="Đổi tốc độ phát (0.8x, 1.0x, 1.2x, 1.5x)"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>{playbackRate}x</span>
          </button>
        </div>
      </div>

      {/* Main control row */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Play / Pause button */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 transition-all cursor-pointer"
          title={isPlaying ? "Tạm dừng" : "Phát audio"}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950 ml-0.5" />}
        </button>

        {/* Skip backward 5s */}
        <button
          type="button"
          onClick={() => skip(-5)}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-slate-700 bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer"
          title="Tua lại 5 giây"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="sr-only">-5s</span>
        </button>

        {/* Skip forward 5s */}
        <button
          type="button"
          onClick={() => skip(5)}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-slate-700 bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer"
          title="Tua tới 5 giây"
        >
          <RotateCw className="w-4 h-4" />
          <span className="sr-only">+5s</span>
        </button>

        {/* Progress track & scrubber */}
        <div className="flex-1 flex flex-col justify-center min-w-[120px] px-1">
          <div className="relative flex items-center h-5 group cursor-pointer">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={handleSeekChange}
              onMouseDown={() => setIsSeeking(true)}
              onMouseUp={() => setIsSeeking(false)}
              onTouchStart={() => setIsSeeking(true)}
              onTouchEnd={() => setIsSeeking(false)}
              className="w-full h-2 rounded-lg bg-slate-800 appearance-none cursor-pointer accent-cyan-400 focus:outline-none focus:ring-0"
              style={{
                background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${progressPercent}%, #1e293b ${progressPercent}%, #1e293b 100%)`,
              }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] sm:text-xs font-mono font-bold text-slate-400 -mt-0.5">
            <span className="text-cyan-300">{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume controls (desktop) */}
        <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-800 shrink-0">
          <button
            type="button"
            onClick={toggleMute}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title={isMuted ? "Bật tiếng" : "Tắt tiếng"}
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1.5 rounded-lg bg-slate-800 appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>
    </div>
  );
};
