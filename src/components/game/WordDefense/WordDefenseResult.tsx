import React, { useState } from 'react';
import { 
  Trophy, 
  RotateCcw, 
  ArrowLeft, 
  Volume2, 
  CheckCircle2, 
  XCircle, 
  Sun, 
  ShieldCheck, 
  Gauge, 
  Target, 
  Search,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DefenseStats } from './types';
import { wordDefenseSound } from './gameSound';
import { cn } from '@/lib/utils';

interface WordDefenseResultProps {
  stats: DefenseStats;
  isVictory: boolean;
  topicName: string;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export const WordDefenseResult: React.FC<WordDefenseResultProps> = ({
  stats,
  isVictory,
  topicName,
  onPlayAgain,
  onBackToLobby,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'hit' | 'missed'>('all');
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  const filteredWords = stats.wordsReviewed.filter((w) => {
    if (filter === 'hit' && !w.hit) return false;
    if (filter === 'missed' && w.hit) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        w.word.toLowerCase().includes(q) ||
        w.definition_vi.toLowerCase().includes(q) ||
        (w.phonetic && w.phonetic.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handlePlayAudio = (word: string) => {
    setPlayingWord(word);
    wordDefenseSound.speakWord(word);
    setTimeout(() => setPlayingWord(null), 1200);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 select-none">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-zinc-950 p-6 md:p-10 shadow-2xl mb-8 text-center space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-slate-800 text-xs font-black uppercase tracking-wider text-slate-300">
            <span>🛡️</span>
            <span>KẾT THÚC TRẬN CHIẾN KHU VƯỜN</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            {isVictory ? (
              <span className="text-emerald-400">🏆 CHIẾN THẮNG! BẢO VỆ THÀNH CÔNG KHU VƯỜN!</span>
            ) : (
              <span className="text-rose-400">💥 THẤT THỦ! ĐÀN QUÁI VẬT ĐÃ TRÀN VÀO NHÀ!</span>
            )}
          </h1>

          <p className="text-sm text-slate-300">
            Chủ đề từ vựng: <span className="text-emerald-300 font-bold">{topicName}</span>
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto pt-2">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <span className="text-xs text-slate-400 font-bold block">Tổng Điểm</span>
            <span className="text-2xl font-black text-amber-300">{stats.score.toLocaleString()}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <ShieldCheck className="w-5 h-5 text-rose-400 mx-auto mb-1" />
            <span className="text-xs text-slate-400 font-bold block">Quái Đã Diệt</span>
            <span className="text-2xl font-black text-rose-300">{stats.zombiesDefeated}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <Sun className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <span className="text-xs text-slate-400 font-bold block">Nắng Thu Hoạch</span>
            <span className="text-2xl font-black text-yellow-300">☀️ {stats.sunHarvested}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <Gauge className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <span className="text-xs text-slate-400 font-bold block">Tốc Độ Gõ</span>
            <span className="text-2xl font-black text-cyan-300">{stats.wpm} <span className="text-xs font-bold text-slate-400">WPM</span></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Button
            onClick={onPlayAgain}
            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg active:scale-95 duration-120"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Chơi Lại Trận Này
          </Button>

          <Button
            onClick={onBackToLobby}
            variant="ghost"
            className="text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-bold px-5 py-3 rounded-xl active:scale-95 duration-120"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Về Sảnh Trò Chơi
          </Button>
        </div>
      </div>

      {/* Vocabulary Review */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 backdrop-blur-md shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Bảng Ôn Tập Từ Vựng Trận Đấu
            </h2>
            <p className="text-xs text-slate-400">
              Nghe lại phát âm chuẩn bản xứ và nghĩa tiếng Việt của các từ đã dùng trong trận phòng thủ.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={cn("px-3 py-1.5 rounded-lg font-bold transition-all active:scale-95", filter === 'all' ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white")}
            >
              Tất cả ({stats.wordsReviewed.length})
            </button>
            <button
              onClick={() => setFilter('hit')}
              className={cn("px-3 py-1.5 rounded-lg font-bold transition-all active:scale-95", filter === 'hit' ? "bg-green-600 text-white" : "text-slate-400 hover:text-white")}
            >
              Đã gõ ({stats.wordsReviewed.filter(w=>w.hit).length})
            </button>
            <button
              onClick={() => setFilter('missed')}
              className={cn("px-3 py-1.5 rounded-lg font-bold transition-all active:scale-95", filter === 'missed' ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white")}
            >
              Chưa gõ ({stats.wordsReviewed.filter(w=>!w.hit).length})
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm từ vựng, phiên âm, nghĩa tiếng Việt..."
            className="pl-10 bg-slate-950 border-slate-800 text-white text-base sm:text-xs rounded-xl"
          />
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {filteredWords.map((item, idx) => (
            <div
              key={idx}
              className={cn(
                "p-4 rounded-2xl border transition-all flex items-center justify-between gap-3",
                item.hit 
                  ? "bg-slate-950/70 border-emerald-500/30 hover:border-emerald-500/60" 
                  : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
              )}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-white">{item.word}</span>
                  {item.phonetic && (
                    <span className="text-xs text-emerald-400 font-mono bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
                      {item.phonetic}
                    </span>
                  )}
                  {item.hit ? (
                    <span className="text-xs font-bold uppercase text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
                      Đã triệu hồi
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-300 truncate">{item.definition_vi}</p>
              </div>

              <button
                onClick={() => handlePlayAudio(item.word)}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90 duration-120",
                  playingWord === item.word 
                    ? "bg-emerald-500 text-slate-950 scale-105" 
                    : "bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                )}
                title="Nghe phát âm"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
