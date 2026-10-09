import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '@/components/StudentLayout';
import { 
  Gamepad2, 
  Rocket, 
  Swords, 
  Sparkles, 
  Flame, 
  Trophy, 
  Zap, 
  Users, 
  HelpCircle,
  Volume2,
  Shield,
  BookOpen,
  ArrowRight,
  Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGamification } from '@/hooks/useGamification';
import { WordShooterTutorialModal } from '@/components/game/WordShooter/WordShooterTutorialModal';
import { WordShooterLeaderboardModal } from '@/components/game/WordShooter/WordShooterLeaderboardModal';
import { DEFAULT_VOCAB_TOPICS } from '@/components/game/WordShooter/defaultVocabPacks';
import { getPlayerRank, formatRankInfo } from '@/services/wordShooterRankService';
import { cn } from '@/lib/utils';

export default function GamesHub() {
  const navigate = useNavigate();
  const { xp, streak } = useGamification();
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const playerRank = getPlayerRank();
  const rankInfo = formatRankInfo(playerRank);

  return (
    <StudentLayout>
      <div className="w-full max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-8 select-none font-sans">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 md:p-10 shadow-2xl">
          {/* Ambient Lighting */}
          <div className="absolute top-0 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-black tracking-wider uppercase">
                <Rocket className="w-4 h-4 text-cyan-400 animate-pulse" />
                Đấu Trường Từ Vựng Phản Xạ 2.0
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                PHI CƠ DIỆT TỪ VỰNG <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                  SKY STRIKE VOCAB
                </span>
              </h1>

              <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                Rèn luyện tốc độ gõ phím và phản xạ ghi nhớ từ vựng TOEIC đỉnh cao. Bắn hạ từ rơi tự do bằng tia Laser, kích hoạt phát âm chuẩn bản xứ và popup nghĩa tiếng Việt tức thì!
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={() => navigate('/games/word-shooter')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm px-8 py-6 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all duration-150 active:scale-95 cursor-pointer"
                >
                  <Rocket className="w-5 h-5 mr-2" />
                  VÀO CHIẾN GAME NGAY
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsLeaderboardOpen(true)}
                  className="border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 font-bold text-sm px-5 py-6 rounded-2xl transition-all cursor-pointer shadow-lg"
                >
                  <Trophy className="w-4 h-4 mr-2 text-amber-400" />
                  Bảng Xếp Hạng
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsTutorialOpen(true)}
                  className="border-cyan-500/30 bg-slate-900/60 hover:bg-cyan-950/40 text-cyan-300 font-bold text-sm px-5 py-6 rounded-2xl transition-all cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 mr-2 text-cyan-400" />
                  Hướng Dẫn Cách Chơi
                </Button>
              </div>
            </div>

            {/* Gamification Stats Card */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl shrink-0 w-full sm:w-auto md:min-w-[220px]">
              {/* Rank Info */}
              <div 
                onClick={() => setIsLeaderboardOpen(true)}
                className="flex items-center gap-3 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 cursor-pointer hover:bg-amber-500/20 transition-colors"
                title="Xem Bảng Xếp Hạng Liên Quân"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-lg">
                  {rankInfo.icon}
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">Hạng Liên Quân</span>
                  <p className="text-sm font-black text-amber-300">
                    {rankInfo.tierNameVi} {rankInfo.divisionRoman}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg">
                  ⚡
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Kinh nghiệm</span>
                  <p className="text-base font-black text-cyan-400">{xp.toLocaleString()} XP</p>
                </div>
              </div>

              <div className="h-px bg-slate-800 hidden sm:block md:block" />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-lg">
                  🔥
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Chuỗi ngày học</span>
                  <p className="text-base font-black text-rose-400">{streak} ngày liên tiếp</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Game Modes Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              4 Chế Độ Chơi Sẵn Sàng
            </h2>
            <span className="text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
              👑 Chỉ có Đấu Hạng mới tính rank (+1 ⭐ / -1 ⭐)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Mode 1: Solo Mode */}
            <div 
              onClick={() => navigate('/games/word-shooter')}
              className="p-5 rounded-3xl border border-border/80 bg-card hover:border-cyan-500/60 hover:shadow-soft-md transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  🚀
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-base font-black text-foreground">1. Đấu Đơn</h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                      Không rank
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-cyan-500 mt-0.5">Vượt Wave • Săn Kỷ Lục</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Luyện tập tự do qua các wave. Bắn hạ từ rơi, thu thập bùa đóng băng, hồi máu và bom hạt nhân.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-bold text-primary">
                <span>Vào Chơi Đơn</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Mode 2: Bot Practice */}
            <div 
              onClick={() => navigate('/games/word-shooter')}
              className="p-5 rounded-3xl border border-border/80 bg-card hover:border-purple-500/60 hover:shadow-soft-md transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  🤖
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-base font-black text-foreground">2. Đấu Máy</h3>
                    <span className="px-2 py-0.5 rounded-full bg-purple-950 border border-purple-400/40 text-purple-300 text-[10px] font-bold">
                      Luyện tập 60s
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-purple-500 mt-0.5">AI Pilot • Không tính rank</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Đấu chung 1 màn hình 60s với AI Pilot để rèn luyện phản xạ gõ nhanh mà không sợ trừ sao.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-bold text-purple-500">
                <span>Đấu Với Máy</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Mode 3: Casual PvP */}
            <div 
              onClick={() => navigate('/games/word-shooter')}
              className="p-5 rounded-3xl border border-border/80 bg-card hover:border-blue-500/60 hover:shadow-soft-md transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  ⚔️
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-base font-black text-foreground">3. Đấu Thường</h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-950 border border-blue-400/40 text-blue-300 text-[10px] font-bold">
                      Giao hữu online
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-blue-500 mt-0.5">Phòng 1v1 • Không tính rank</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tạo phòng và gửi mã mời bạn bè. Thi tài tốc độ 1v1 vui vẻ, không bị cộng trừ điểm xếp hạng.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-bold text-blue-500">
                <span>Giao Hữu 1v1</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Mode 4: Ranked PvP */}
            <div 
              onClick={() => navigate('/games/word-shooter')}
              className="p-5 rounded-3xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-950/20 via-card to-amber-950/10 hover:border-amber-400 hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 text-slate-950 flex items-center justify-center text-xl font-bold group-hover:scale-110 transition-transform shadow-md">
                  👑
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-base font-black text-amber-400">4. Đấu Hạng</h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black animate-pulse">
                      +1 ⭐ RANK
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-amber-300 mt-0.5">Ghép Trận Cân Bằng • Duy Nhất Tính Rank</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tự động ghép đối thủ chênh lệch rank ≤ 1 bậc (không tạo phòng). Thắng +1 sao, Thua -1 sao. Leo rank từ Đồng lên Cao Thủ!
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-500/30 flex items-center justify-between text-xs font-black text-amber-400">
                <span>Leo Rank Ngay</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* 5 Core Vocab Packs Showcase */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-500" />
              5 Bộ Từ Vựng Chuẩn Thực Chiến ({DEFAULT_VOCAB_TOPICS.length} Bộ Có Sẵn)
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              Tích hợp sẵn âm thanh &amp; phiên âm chuẩn
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEFAULT_VOCAB_TOPICS.map((topic) => (
              <div 
                key={topic.id}
                onClick={() => navigate('/games/word-shooter')}
                className="p-4 rounded-2xl border border-border/70 bg-card hover:border-primary/40 hover:shadow-soft-xs transition-all duration-150 cursor-pointer flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-xl shrink-0">
                  {topic.icon}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-foreground truncate">{topic.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {topic.description}
                  </p>
                  <span className="inline-block text-[11px] font-bold text-primary">
                    {topic.words.length} từ vựng
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How to Play Tutorial Modal */}
        <WordShooterTutorialModal
          isOpen={isTutorialOpen}
          onClose={() => setIsTutorialOpen(false)}
          onComplete={() => navigate('/games/word-shooter')}
        />

        {/* Leaderboard Modal */}
        <WordShooterLeaderboardModal
          isOpen={isLeaderboardOpen}
          onClose={() => setIsLeaderboardOpen(false)}
        />
      </div>
    </StudentLayout>
  );
}
