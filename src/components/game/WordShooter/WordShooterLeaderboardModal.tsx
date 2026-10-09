import React, { useState } from 'react';
import { 
  Trophy, 
  Crown, 
  Flame, 
  Sparkles, 
  X, 
  Shield, 
  Zap, 
  Star, 
  TrendingUp, 
  Users,
  Target,
  Medal,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  getStoredPlayerRank, 
  formatRankInfo, 
  getLeaderboardData, 
  RANK_TIERS_CONFIG, 
  LeaderboardEntry,
  RankTier
} from '@/services/wordShooterRankService';
import { cn } from '@/lib/utils';

interface WordShooterLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayRank?: () => void;
  userName?: string;
}

export const WordShooterLeaderboardModal: React.FC<WordShooterLeaderboardModalProps> = ({
  isOpen,
  onClose,
  onPlayRank,
  userName = 'Bạn',
}) => {
  if (!isOpen) return null;

  const playerRank = getStoredPlayerRank();
  const rankInfo = formatRankInfo(playerRank);
  const leaderboard = getLeaderboardData(playerRank, userName);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'rank_info'>('leaderboard');

  const top1 = leaderboard.find((p) => p.rankPosition === 1);
  const top2 = leaderboard.find((p) => p.rankPosition === 2);
  const top3 = leaderboard.find((p) => p.rankPosition === 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden">
        {/* Glow Accents */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 px-6 py-5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/30 border border-amber-500/50 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                  ĐẤU TRƯỜNG RANK & BXH
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 uppercase tracking-widest">
                  MÙA 1
                </span>
              </div>
              <p className="text-xs text-slate-400">Hệ thống phân hạng 1v1 chuẩn Liên Quân Mobile — Thắng +1 ⭐, Thua -1 ⭐</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800/80 bg-slate-950/60 px-6 pt-2">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={cn(
              "px-5 py-3 font-black text-xs uppercase tracking-wider transition-all border-b-2",
              activeTab === 'leaderboard'
                ? "border-cyan-400 text-cyan-300 bg-cyan-500/10 rounded-t-xl"
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            🏆 Top Cao Thủ & Chiến Tướng
          </button>
          <button
            onClick={() => setActiveTab('rank_info')}
            className={cn(
              "px-5 py-3 font-black text-xs uppercase tracking-wider transition-all border-b-2",
              activeTab === 'rank_info'
                ? "border-amber-400 text-amber-300 bg-amber-500/10 rounded-t-xl"
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            ⭐ Hệ Thống Bậc Rank (Đồng ➔ Chiến Tướng)
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === 'leaderboard' ? (
            <>
              {/* TOP 3 PODIUM */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-4 pb-2">
                {/* TOP 2 */}
                {top2 && (
                  <div className="flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-800/60 to-slate-900/80 border border-slate-700/60 shadow-xl relative order-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-400 text-slate-950 font-black text-xs flex items-center justify-center -top-3.5 absolute border-2 border-slate-900 shadow">
                      2
                    </div>
                    <div className="text-2xl sm:text-3xl mb-1">{top2.avatar}</div>
                    <p className="text-xs sm:text-sm font-black text-slate-200 truncate max-w-full">{top2.name}</p>
                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">{top2.tierNameVi} {top2.divisionRoman}</span>
                    <div className="flex items-center gap-1 mt-1 text-amber-300 font-black text-xs">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{top2.stars} ⭐</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold mt-1">Thắng {top2.winRate}%</span>
                  </div>
                )}

                {/* TOP 1 CHAMPION */}
                {top1 && (
                  <div className="flex flex-col items-center p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-amber-500/20 via-yellow-950/40 to-slate-900 border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.3)] relative order-2 scale-105 z-10">
                    <Crown className="w-7 h-7 text-amber-400 animate-bounce -top-6 absolute drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                    <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center -top-4 absolute border-2 border-slate-900 shadow">
                      1
                    </div>
                    <div className="text-3xl sm:text-4xl mb-1 mt-1">{top1.avatar}</div>
                    <p className="text-sm sm:text-base font-black text-amber-300 truncate max-w-full">{top1.name}</p>
                    <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">{top1.tierNameVi}</span>
                    <div className="flex items-center gap-1 mt-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs sm:text-sm shadow">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span>{top1.stars} SAO</span>
                    </div>
                    <span className="text-xs text-emerald-400 font-bold mt-1.5">Tỷ lệ thắng {top1.winRate}% ({top1.wins} trận)</span>
                  </div>
                )}

                {/* TOP 3 */}
                {top3 && (
                  <div className="flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-amber-950/40 to-slate-900/80 border border-amber-800/40 shadow-xl relative order-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center -top-3.5 absolute border-2 border-slate-900 shadow">
                      3
                    </div>
                    <div className="text-2xl sm:text-3xl mb-1">{top3.avatar}</div>
                    <p className="text-xs sm:text-sm font-black text-slate-200 truncate max-w-full">{top3.name}</p>
                    <span className="text-[10px] font-bold text-amber-500 mt-0.5">{top3.tierNameVi} {top3.divisionRoman}</span>
                    <div className="flex items-center gap-1 mt-1 text-amber-300 font-black text-xs">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{top3.stars} ⭐</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold mt-1">Thắng {top3.winRate}%</span>
                  </div>
                )}
              </div>

              {/* CURRENT PLAYER STATUS CARD */}
              <div className="p-4 sm:p-5 rounded-2xl border-2 border-cyan-400 bg-gradient-to-r from-blue-950/80 via-slate-900 to-cyan-950/80 shadow-[0_0_25px_rgba(6,182,212,0.3)] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl border flex flex-col items-center justify-center font-black text-2xl shadow-xl",
                    rankInfo.badgeBorder,
                    `bg-gradient-to-br ${rankInfo.badgeBg}`
                  )}>
                    <span>{rankInfo.icon}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">HẠNG CỦA BẠN</span>
                      {playerRank.winStreak >= 3 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[10px] font-black flex items-center gap-1">
                          <Flame className="w-3 h-3" /> Chuỗi {playerRank.winStreak} trận
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      {rankInfo.tierNameVi} {rankInfo.divisionRoman}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      {Array.from({ length: rankInfo.maxStars }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "w-4 h-4 transition-all",
                            i < rankInfo.stars
                              ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                              : "text-slate-700"
                          )}
                        />
                      ))}
                      <span className="text-xs font-black text-amber-300 ml-1">
                        ({rankInfo.stars}/{rankInfo.maxStars} ⭐)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block font-semibold">Tỉ lệ thắng</span>
                    <span className="text-base font-black text-emerald-400">
                      {playerRank.totalMatches > 0 ? Math.round((playerRank.wins / playerRank.totalMatches) * 100) : 100}%
                    </span>
                    <span className="text-[10px] text-slate-500 block">({playerRank.wins}T / {playerRank.losses}B)</span>
                  </div>

                  {onPlayRank && (
                    <Button
                      onClick={() => {
                        onClose();
                        onPlayRank();
                      }}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-5 py-5 rounded-xl shadow-lg cursor-pointer"
                    >
                      <Zap className="w-4 h-4 mr-1.5" />
                      ĐẤU RANK
                    </Button>
                  )}
                </div>
              </div>

              {/* LEADERBOARD LIST TABLE */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
                <div className="grid grid-cols-12 px-4 py-3 bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <div className="col-span-2 sm:col-span-1 text-center">Hạng</div>
                  <div className="col-span-5 sm:col-span-5">Cao Thủ</div>
                  <div className="col-span-3 sm:col-span-3 text-center">Bậc Rank</div>
                  <div className="col-span-2 sm:col-span-3 text-right">Số Sao & Thắng</div>
                </div>

                <div className="divide-y divide-slate-800/60">
                  {leaderboard.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "grid grid-cols-12 px-4 py-3.5 items-center transition-colors text-xs sm:text-sm",
                        item.isCurrentUser 
                          ? "bg-cyan-500/10 border-l-4 border-l-cyan-400 font-bold" 
                          : "hover:bg-slate-800/40"
                      )}
                    >
                      {/* Rank Position */}
                      <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                        {item.rankPosition === 1 && <span className="text-amber-400 font-black text-base">🥇</span>}
                        {item.rankPosition === 2 && <span className="text-slate-300 font-black text-base">🥈</span>}
                        {item.rankPosition === 3 && <span className="text-amber-600 font-black text-base">🥉</span>}
                        {item.rankPosition > 3 && (
                          <span className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center font-black text-xs",
                            item.isCurrentUser ? "bg-cyan-500 text-slate-950" : "text-slate-400"
                          )}>
                            {item.rankPosition}
                          </span>
                        )}
                      </div>

                      {/* Pilot Name */}
                      <div className="col-span-5 sm:col-span-5 flex items-center gap-2.5 truncate">
                        <span className="text-xl shrink-0">{item.avatar}</span>
                        <div className="truncate">
                          <span className={cn(
                            "font-black tracking-wide truncate block",
                            item.isCurrentUser ? "text-cyan-300" : "text-white"
                          )}>
                            {item.name} {item.isCurrentUser && '(Bạn)'}
                          </span>
                        </div>
                      </div>

                      {/* Tier Name */}
                      <div className="col-span-3 sm:col-span-3 flex items-center justify-center">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-black text-amber-300">
                          {item.tierNameVi} {item.divisionRoman}
                        </span>
                      </div>

                      {/* Stars & Win Rate */}
                      <div className="col-span-2 sm:col-span-3 text-right">
                        <div className="flex items-center justify-end gap-1 font-black text-amber-300 text-xs sm:text-sm">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{item.stars}</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-semibold block">
                          {item.wins} thắng ({item.winRate}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* RANK SYSTEM GUIDE TAB */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-200 text-xs sm:text-sm leading-relaxed">
                🎯 <strong>Cơ chế tính Rank Liên Quân trong Phi Cơ Diệt Từ:</strong>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-300">
                  <li><strong>Chế độ 1v1:</strong> Cả 2 phi công chiến đấu <strong>chung 1 màn hình</strong>, cùng tranh nhau bắn hạ kho từ rơi tự do.</li>
                  <li><strong>Thắng cuộc:</strong> Bên nào bắn hạ được <strong>nhiều từ vựng hơn</strong> trong 60 giây nghẹt thở sẽ giành chiến thắng!</li>
                  <li><strong>Thắng:</strong> <code>+1 ⭐</code> (đủ sao thì thăng bậc rank, có chuỗi thắng thì tích điểm dũng khí nhân đôi sao).</li>
                  <li><strong>Thua:</strong> <code>-1 ⭐</code> (riêng bậc <strong>Đồng</strong> được bảo hộ tân thủ, thua không bị trừ sao!).</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(RANK_TIERS_CONFIG).map(([tierKey, tier]) => (
                  <div
                    key={tierKey}
                    className={cn(
                      "p-3.5 rounded-2xl border bg-gradient-to-b flex flex-col gap-1.5 transition-all",
                      tier.badgeBorder,
                      tier.badgeBg
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{tier.icon}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-300 border border-slate-700">
                        {tier.divisions > 1 ? `${tier.divisions} bậc` : 'Vô cực'}
                      </span>
                    </div>
                    <h4 className={cn("font-black text-sm uppercase tracking-wide", tier.badgeColor)}>
                      {tier.nameVi}
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      {tierKey === 'bronze' && '3 sao/bậc • Không trừ sao khi thua'}
                      {tierKey === 'silver' && '3 sao/bậc • Thử thách tân thủ'}
                      {tierKey === 'gold' && '4 sao/bậc • Bắt đầu tranh tài'}
                      {tierKey === 'platinum' && '4 sao/bậc • Phản xạ cao'}
                      {tierKey === 'diamond' && '5 sao/bậc • Cao thủ gõ phím'}
                      {tierKey === 'veteran' && '5 sao/bậc • Đỉnh cao từ vựng'}
                      {tierKey === 'master' && 'Tích lũy sao không giới hạn'}
                      {tierKey === 'grandmaster' && 'Top 50 Cao Thủ trên 50 Sao'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Hệ thống Rank làm mới theo mùa. Hãy leo Rank và ghi danh vào bảng vàng!
          </span>

          <Button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-6 rounded-xl cursor-pointer"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};
