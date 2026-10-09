import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  RotateCcw, 
  ArrowLeft, 
  Volume2, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  Target, 
  Gauge, 
  Sparkles, 
  Search,
  Filter,
  Flame,
  Award,
  Crown,
  Swords,
  Users,
  Star,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GameStats, WordReviewItem, VocabTopic, GameDifficulty } from './types';
import { gameSound } from './gameSound';
import { cn } from '@/lib/utils';
import { formatRankInfo, PlayerRankData, getPlayerRank } from '@/services/wordShooterRankService';

interface WordShooterResultProps {
  stats: GameStats;
  topic: VocabTopic;
  difficulty: GameDifficulty;
  isVictory?: boolean;
  isPvP?: boolean;
  opponentName?: string;
  opponentStats?: {
    score?: number;
    wpm?: number;
    accuracy?: number;
    maxCombo?: number;
    hitCount?: number;
    missedCount?: number;
    waveReached?: number;
  };
  pvpResult?: {
    playerKills: number;
    opponentKills: number;
    isRanked?: boolean;
    mode?: string;
    rankResult?: {
      previous: PlayerRankData;
      updated: PlayerRankData;
      starsChanged: number;
      promoted: boolean;
      demoted: boolean;
    };
  };
  onOpenLeaderboard?: () => void;
  onPlayAgain: () => void;
  onPracticeMissedWords?: (words: WordReviewItem[]) => void;
  onBackToLobby: () => void;
}

export const WordShooterResult: React.FC<WordShooterResultProps> = ({
  stats,
  topic,
  difficulty,
  isVictory = false,
  isPvP = false,
  opponentName,
  opponentStats,
  pvpResult,
  onOpenLeaderboard,
  onPlayAgain,
  onPracticeMissedWords,
  onBackToLobby,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'hit' | 'missed'>('all');
  const [playingWordId, setPlayingWordId] = useState<string | number | null>(null);

  const [isNewRecord, setIsNewRecord] = useState(false);

  // Current rank data
  const currentRankData = pvpResult?.rankResult?.updated || getPlayerRank();
  const currentRankInfo = formatRankInfo(currentRankData);

  // Save Record to LocalStorage
  useEffect(() => {
    try {
      const savedStr = localStorage.getItem('word_shooter_records');
      const records = savedStr ? JSON.parse(savedStr) : {};
      const prev = records[topic.id];

      if (!prev || stats.score > prev.score) {
        setIsNewRecord(true);
      }

      records[topic.id] = {
        score: Math.max(stats.score, prev?.score || 0),
        combo: Math.max(stats.maxCombo, prev?.combo || 0),
        wave: Math.max(stats.waveReached || 1, prev?.wave || 1),
        date: new Date().toISOString(),
      };
      localStorage.setItem('word_shooter_records', JSON.stringify(records));
    } catch {}
  }, [stats, topic.id]);

  // Keyboard shortcuts (Space/Enter to replay, Esc to go back)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onPlayAgain();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onBackToLobby();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onPlayAgain, onBackToLobby]);

  const missedWords = stats.wordsReviewed.filter((w) => !w.hit);
  const hitWords = stats.wordsReviewed.filter((w) => w.hit);

  const filteredWords = stats.wordsReviewed.filter((item) => {
    if (filterType === 'hit' && !item.hit) return false;
    if (filterType === 'missed' && item.hit) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.word.toLowerCase().includes(q) ||
        item.definition_vi.toLowerCase().includes(q) ||
        (item.phonetic && item.phonetic.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handlePlayWordAudio = (item: WordReviewItem) => {
    setPlayingWordId(item.id);
    gameSound.speakWord(item.word, item.audioUrl);
    setTimeout(() => {
      setPlayingWordId(null);
    }, 1200);
  };

  const getRankBadge = (score: number, acc: number) => {
    if (score > 3000 && acc >= 90) return { title: 'HUYỀN THOẠI TOP GUN', color: 'from-amber-400 to-yellow-500', icon: '👑' };
    if (score > 1800 && acc >= 80) return { title: 'PHI CÔNG ACE TINH NHUỆ', color: 'from-cyan-400 to-blue-500', icon: '⭐' };
    if (score > 800) return { title: 'CHIẾN BINH PHI ĐỘI', color: 'from-emerald-400 to-teal-500', icon: '🎖️' };
    return { title: 'TÂN BINH ĐANG RÈN LUYỆN', color: 'from-slate-400 to-slate-500', icon: '🚀' };
  };

  const rank = getRankBadge(stats.score, stats.accuracy);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 select-none">
      {/* Top Banner Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-zinc-950 p-6 md:p-10 shadow-2xl mb-8 text-center space-y-6">
        {/* Glow ambient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        {isPvP && isVictory && <div className="absolute top-0 left-1/3 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />}

        <div className="relative z-10 space-y-3">
          {/* PvP Result Banner */}
          {isPvP && (
            <div className={cn(
              "inline-flex items-center gap-2 px-5 py-2 rounded-full border text-sm font-black tracking-wider uppercase mb-2",
              isVictory
                ? "bg-amber-500/15 border-amber-400/50 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                : "bg-rose-500/10 border-rose-500/40 text-rose-400"
            )}>
              {pvpResult?.isRanked ? (
                isVictory ? (
                  <><Crown className="w-5 h-5 text-amber-400 animate-bounce" /> THẮNG ĐẤU HẠNG (+1 ⭐)</>
                ) : (
                  <><Swords className="w-5 h-5 text-rose-400" /> THUA ĐẤU HẠNG (-1 ⭐)</>
                )
              ) : (
                isVictory ? (
                  <><Crown className="w-5 h-5 text-emerald-400 animate-bounce" /> THẮNG GIAO HỮU / ĐẤU MÁY</>
                ) : (
                  <><Swords className="w-5 h-5 text-rose-400" /> THUA GIAO HỮU / ĐẤU MÁY</>
                )
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-black tracking-wider uppercase">
              <span>{rank.icon}</span>
              <span className={cn("bg-clip-text text-transparent bg-gradient-to-r", rank.color)}>
                {rank.title}
              </span>
            </div>

            {isNewRecord && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-black tracking-wider uppercase animate-bounce shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                <Award className="w-4 h-4 text-amber-400" />
                KỶ LỤC CÁ NHÂN MỚI!
              </div>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            {isPvP ? (
              isVictory ? (
                <span className="text-emerald-400">🏆 CHIẾN THẮNG TRẬN ĐẤU!</span>
              ) : (
                <span className="text-rose-400">💥 BỊ BẮN HẠ BỞI {opponentName || 'ĐỐI THỦ'}!</span>
              )
            ) : (
              <span>HOÀN THÀNH CHUYẾN BAY!</span>
            )}
          </h1>

          <p className="text-sm text-slate-300 max-w-lg mx-auto">
            Chủ đề: <span className="font-bold text-cyan-300">{topic.name}</span> • Cấp độ: <span className="font-bold text-amber-300 uppercase">{difficulty}</span>
          </p>
        </div>

        {/* Liên Quân Mobile Rank Progression Card (Chỉ hiện khi ĐẤU HẠNG) */}
        {isPvP && pvpResult?.isRanked && (
          <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/40 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5 md:p-6 shadow-[0_0_35px_rgba(245,158,11,0.25)] max-w-3xl mx-auto space-y-4 text-left">
            {/* Header: Tier + Star Change Result */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-purple-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-lg shrink-0">
                  {currentRankInfo.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl md:text-2xl font-black text-amber-300 tracking-wide">
                      {currentRankInfo.tierNameVi} {currentRankInfo.divisionRoman}
                    </span>
                    {pvpResult?.rankResult?.promoted && (
                      <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-xs font-black uppercase animate-bounce shadow-md">
                        🎉 THĂNG HẠNG!
                      </span>
                    )}
                    {pvpResult?.rankResult?.demoted && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-xs font-black uppercase">
                        GIÁNG HẠNG
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hạng Liên Quân Mobile • {currentRankData.totalMatches} trận ({currentRankData.wins} thắng - Tỉ lệ {currentRankData.totalMatches > 0 ? Math.round((currentRankData.wins / currentRankData.totalMatches) * 100) : 100}%)
                  </p>
                </div>
              </div>

              {/* Star Change Pill */}
              <div className="flex flex-col items-center sm:items-end gap-1 shrink-0">
                {isVictory ? (
                  <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 font-black text-sm md:text-base shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-bounce">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-300" />
                    <span>+1 SAO (THẮNG)</span>
                  </div>
                ) : pvpResult?.rankResult?.starsChanged === 0 ? (
                  <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-950/80 border border-cyan-400/80 text-cyan-300 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>BẢO HỘ TÂN THỦ (0 SAO)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/20 border-2 border-rose-500 text-rose-300 font-black text-sm md:text-base">
                    <Star className="w-5 h-5 text-rose-400 opacity-50" />
                    <span>-1 SAO (THUA)</span>
                  </div>
                )}
                {currentRankData.winStreak > 1 && (
                  <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
                    Chuỗi {currentRankData.winStreak} trận thắng!
                  </span>
                )}
              </div>
            </div>

            {/* Stars Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Số sao hiện tại:
                </span>
                {currentRankData.tier === 'master' || currentRankData.tier === 'grandmaster' ? (
                  <div className="flex items-center gap-1.5 font-black text-amber-300 text-lg">
                    <Star className="w-6 h-6 fill-amber-400 text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                    <span>x{currentRankData.stars} sao</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: currentRankInfo.maxStars }).map((_, starIdx) => {
                      const hasStar = starIdx < currentRankInfo.stars;
                      return (
                        <Star
                          key={starIdx}
                          className={cn(
                            "w-6 h-6 transition-all duration-300",
                            hasStar
                              ? "fill-amber-400 text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)] scale-110"
                              : "text-slate-700 opacity-40 scale-90"
                          )}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {onOpenLeaderboard && (
                <button
                  onClick={onOpenLeaderboard}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-400/60 text-amber-300 font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Bảng Xếp Hạng Cao Thủ
                </button>
              )}
            </div>

            {/* PvP Kills Comparison Badge */}
            {pvpResult && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-cyan-400 uppercase">Bạn:</span>
                  <span className="text-base font-black text-white font-mono">🎯 {pvpResult.playerKills} từ</span>
                </div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest text-center px-2">
                  {pvpResult.playerKills > pvpResult.opponentKills ? (
                    <span className="text-emerald-400 font-black">+ {pvpResult.playerKills - pvpResult.opponentKills} từ thắng thế!</span>
                  ) : pvpResult.playerKills < pvpResult.opponentKills ? (
                    <span className="text-rose-400 font-black">- {pvpResult.opponentKills - pvpResult.playerKills} từ hụt lại</span>
                  ) : (
                    <span className="text-amber-400 font-black">Hòa tỉ số kills</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-rose-400 uppercase">{opponentName || 'Đối thủ'}:</span>
                  <span className="text-base font-black text-white font-mono">🎯 {pvpResult.opponentKills} từ</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Casual PvP / Bot Practice Match Summary (Không tính rank) */}
        {isPvP && !pvpResult?.isRanked && (
          <div className="relative overflow-hidden rounded-3xl border border-slate-700 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5 md:p-6 shadow-xl max-w-3xl mx-auto space-y-4 text-left">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl shrink-0">
                  ⚔️
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg md:text-xl font-black text-white tracking-wide">
                      Trận Đấu Giao Hữu / Đấu Máy
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-bold uppercase">
                      Không Tính Rank
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Rèn luyện kỹ năng gõ và tốc độ phản xạ • Điểm rank Liên Quân Mobile được bảo lưu nguyên vẹn
                  </p>
                </div>
              </div>

              {onOpenLeaderboard && (
                <button
                  onClick={onOpenLeaderboard}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-400/60 text-amber-300 font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Bảng Xếp Hạng
                </button>
              )}
            </div>

            {/* Kills Comparison Row */}
            {pvpResult && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-cyan-400 uppercase">Bạn:</span>
                  <span className="text-base font-black text-white font-mono">🎯 {pvpResult.playerKills} từ</span>
                </div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest text-center px-2">
                  {pvpResult.playerKills > pvpResult.opponentKills ? (
                    <span className="text-emerald-400 font-black">+ {pvpResult.playerKills - pvpResult.opponentKills} từ thắng thế!</span>
                  ) : pvpResult.playerKills < pvpResult.opponentKills ? (
                    <span className="text-rose-400 font-black">- {pvpResult.opponentKills - pvpResult.playerKills} từ hụt lại</span>
                  ) : (
                    <span className="text-amber-400 font-black">Hòa tỉ số kills</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-rose-400 uppercase">{opponentName || 'Đối thủ'}:</span>
                  <span className="text-base font-black text-white font-mono">🎯 {pvpResult.opponentKills} từ</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5 Core Performance Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 max-w-4xl mx-auto pt-2">
          {/* Total Score */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-400 mb-1" />
            <p className="text-xs text-slate-400 font-bold">Tổng Điểm</p>
            <p className="text-2xl md:text-3xl font-black text-amber-300 mt-0.5">
              {stats.score.toLocaleString()}
            </p>
          </div>

          {/* Typing Speed (WPM) */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center">
            <Gauge className="w-5 h-5 text-cyan-400 mb-1" />
            <p className="text-xs text-slate-400 font-bold">Tốc Độ Gõ</p>
            <p className="text-2xl md:text-3xl font-black text-cyan-300 mt-0.5">
              {stats.wpm} <span className="text-xs font-bold text-slate-400">WPM</span>
            </p>
          </div>

          {/* Accuracy */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center">
            <Target className="w-5 h-5 text-emerald-400 mb-1" />
            <p className="text-xs text-slate-400 font-bold">Độ Chính Xác</p>
            <p className="text-2xl md:text-3xl font-black text-emerald-300 mt-0.5">
              {stats.accuracy}%
            </p>
          </div>

          {/* Max Combo */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center">
            <Flame className="w-5 h-5 text-rose-400 mb-1" />
            <p className="text-xs text-slate-400 font-bold">Chuỗi Combo</p>
            <p className="text-2xl md:text-3xl font-black text-rose-300 mt-0.5">
              {stats.maxCombo}x
            </p>
          </div>

          {/* Wave Reached */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center col-span-2 md:col-span-1">
            <Zap className="w-5 h-5 text-indigo-400 mb-1" />
            <p className="text-xs text-slate-400 font-bold">Đợt Tấn Công</p>
            <p className="text-2xl md:text-3xl font-black text-indigo-300 mt-0.5">
              Wave {stats.waveReached || 1}
            </p>
          </div>
        </div>

        {/* PvP Side-by-Side Comparison Card */}
        {isPvP && opponentStats && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden">
            <div className="p-3 bg-slate-900/80 border-b border-slate-800 text-center">
              <h3 className="text-sm font-black text-white flex items-center justify-center gap-2">
                <Swords className="w-4 h-4 text-cyan-400" />
                SO SÁNH TRẬN ĐẤU
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-px bg-slate-800">
              {/* Headers */}
              <div className="bg-slate-950 p-3 text-center">
                <span className={cn(
                  "text-xs font-black",
                  isVictory ? "text-amber-300" : "text-white"
                )}>
                  {isVictory && <Crown className="w-3 h-3 inline mr-1 text-amber-400" />}
                  BẠN
                </span>
              </div>
              <div className="bg-slate-950 p-3 text-center">
                <span className="text-xs font-bold text-slate-500">VS</span>
              </div>
              <div className="bg-slate-950 p-3 text-center">
                <span className={cn(
                  "text-xs font-black",
                  !isVictory ? "text-amber-300" : "text-white"
                )}>
                  {!isVictory && <Crown className="w-3 h-3 inline mr-1 text-amber-400" />}
                  {opponentName || 'Đối thủ'}
                </span>
              </div>

              {/* Score Row */}
              {[
                { label: 'Điểm số', mine: stats.score.toLocaleString(), theirs: (opponentStats.score || 0).toLocaleString(), myVal: stats.score, theirVal: opponentStats.score || 0 },
                { label: 'WPM', mine: `${stats.wpm}`, theirs: `${opponentStats.wpm || 0}`, myVal: stats.wpm, theirVal: opponentStats.wpm || 0 },
                { label: 'Độ chính xác', mine: `${stats.accuracy}%`, theirs: `${opponentStats.accuracy || 100}%`, myVal: stats.accuracy, theirVal: opponentStats.accuracy || 100 },
                { label: 'Max Combo', mine: `${stats.maxCombo}x`, theirs: `${opponentStats.maxCombo || 0}x`, myVal: stats.maxCombo, theirVal: opponentStats.maxCombo || 0 },
                { label: 'Bắn trúng', mine: `${stats.hitCount}`, theirs: `${opponentStats.hitCount || 0}`, myVal: stats.hitCount, theirVal: opponentStats.hitCount || 0 },
              ].map(({ label, mine, theirs, myVal, theirVal }) => (
                <React.Fragment key={label}>
                  <div className={cn(
                    "bg-slate-950 p-2.5 text-center",
                    myVal > theirVal && "bg-emerald-950/30"
                  )}>
                    <span className={cn("text-sm font-black", myVal > theirVal ? "text-emerald-300" : "text-white")}>{mine}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 text-center">
                    <span className="text-xs font-bold text-slate-500">{label}</span>
                  </div>
                  <div className={cn(
                    "bg-slate-950 p-2.5 text-center",
                    theirVal > myVal && "bg-emerald-950/30"
                  )}>
                    <span className={cn("text-sm font-black", theirVal > myVal ? "text-emerald-300" : "text-white")}>{theirs}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons & Shortcut Tip */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={onPlayAgain}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg active:scale-95 duration-120"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Chơi Lại Ván Mới
            </Button>

            {missedWords.length > 0 && onPracticeMissedWords && (
              <Button
                onClick={() => onPracticeMissedWords(missedWords)}
                variant="outline"
                className="bg-rose-950/40 border-rose-500/50 text-rose-300 hover:bg-rose-900/40 text-sm font-bold px-5 py-3 rounded-xl active:scale-95 duration-120"
              >
                <Zap className="w-4 h-4 mr-2 text-rose-400" />
                Luyện Riêng {missedWords.length} Từ Bắn Hụt
              </Button>
            )}

            <Button
              onClick={onBackToLobby}
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-bold px-5 py-3 rounded-xl active:scale-95 duration-120"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Về Sảnh Chọn Bài
            </Button>
          </div>

          <p className="text-xs text-slate-500 font-medium">
            Phím tắt: Bấm <span className="font-mono text-slate-400 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">[Space]</span> hoặc <span className="font-mono text-slate-400 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">[Enter]</span> để Chơi lại ngay • <span className="font-mono text-slate-400 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">[Esc]</span> Về sảnh
          </p>
        </div>
      </div>

      {/* Section 2: Detailed Vocabulary Review with Audio */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 backdrop-blur-md shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Bảng Ôn Tập Toàn Bộ Từ Vựng
            </h2>
            <p className="text-xs text-slate-400">
              Nhấn vào biểu tượng loa để nghe lại giọng phát âm chuẩn bản xứ và ghi nhớ nghĩa của từng từ.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition-all active:scale-95",
                filterType === 'all' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              Tất cả ({stats.wordsReviewed.length})
            </button>

            <button
              onClick={() => setFilterType('hit')}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition-all active:scale-95 flex items-center gap-1",
                filterType === 'hit' ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đã bắn ({hitWords.length})
            </button>

            <button
              onClick={() => setFilterType('missed')}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1",
                filterType === 'missed' ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              <XCircle className="w-3.5 h-3.5" />
              Bắn hụt ({missedWords.length})
            </button>
          </div>
        </div>

        {/* Search Box */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm từ vựng, phiên âm, nghĩa tiếng Việt..."
            className="pl-10 bg-slate-950 border-slate-800 text-white text-xs rounded-xl"
          />
        </div>

        {/* Word Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {filteredWords.map((item, idx) => {
            const isPlaying = playingWordId === item.id;
            return (
              <div
                key={`${item.id}-${idx}`}
                className={cn(
                  "p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3",
                  item.hit
                    ? "bg-slate-950/70 border-emerald-500/30 hover:border-emerald-500/60"
                    : "bg-slate-950/70 border-rose-500/30 hover:border-rose-500/60"
                )}
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-white tracking-wide">
                      {item.word}
                    </span>
                    {item.phonetic && (
                      <span className="text-xs text-cyan-400/90 font-mono bg-cyan-950/40 px-2 py-0.5 rounded-md border border-cyan-800/40">
                        {item.phonetic}
                      </span>
                    )}
                    {item.hit ? (
                      <span className="text-xs font-black uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-md">
                        Đã bắn
                      </span>
                    ) : (
                      <span className="text-xs font-black uppercase text-rose-400 bg-rose-950/60 border border-rose-800/50 px-2 py-0.5 rounded-md">
                        Bị hụt
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 font-medium truncate">
                    {item.definition_vi}
                  </p>
                </div>

                {/* Speaker Audio Button */}
                <button
                  onClick={() => handlePlayWordAudio(item)}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0 shadow-sm",
                    isPlaying
                      ? "bg-cyan-500 text-slate-950 scale-105 ring-2 ring-cyan-300"
                      : "bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95"
                  )}
                  title="Nghe phát âm chuẩn"
                >
                  <Volume2 className={cn("w-4 h-4", isPlaying && "animate-pulse")} />
                </button>
              </div>
            );
          })}
        </div>

        {filteredWords.length === 0 && (
          <div className="text-center py-12 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
            <p className="text-xs text-slate-400">Không tìm thấy từ vựng nào phù hợp.</p>
          </div>
        )}
      </div>
    </div>
  );
};
